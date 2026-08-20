import { beforeEach, describe, expect, it } from 'vitest'
import {
  CampaignMembershipRepositoryConflictError,
  type CampaignMembershipRecord,
  type CampaignMembershipRepository,
} from './campaign-membership-repository'
import { CampaignMembershipService } from './campaign-membership-service'
import type { CampaignRole } from './campaign-role'

const CAMPAIGN_ID = 'campaign-1'
const OWNER_ID = 'owner-1'
const GM_ID = 'gm-1'
const ASSISTANT_ID = 'assistant-1'
const PLAYER_ID = 'player-1'
const SPECTATOR_ID = 'spectator-1'
const OUTSIDER_ID = 'outsider-1'
const TARGET_ID = 'target-1'

class InMemoryCampaignMembershipRepository implements CampaignMembershipRepository {
  private readonly users = new Set<string>()
  private readonly memberships = new Map<string, CampaignMembershipRecord>()
  private readonly activeCharacterUsers = new Set<string>()
  private sequence = 0

  addUser(userId: string) {
    this.users.add(userId)
  }

  setActiveCharacter(userId: string, active: boolean) {
    if (active) this.activeCharacterUsers.add(userId)
    else this.activeCharacterUsers.delete(userId)
  }

  async addMembership(userId: string, role: CampaignRole) {
    return this.createCampaignMembership({
      campaignId: CAMPAIGN_ID,
      userId,
      role,
    })
  }

  findCampaignById(campaignId: string) {
    return Promise.resolve(
      campaignId === CAMPAIGN_ID
        ? { id: CAMPAIGN_ID, ownerId: OWNER_ID }
        : null,
    )
  }

  userExists(userId: string) {
    return Promise.resolve(this.users.has(userId))
  }

  findCampaignMembership(campaignId: string, userId: string) {
    return Promise.resolve(
      this.memberships.get(this.key(campaignId, userId)) ?? null,
    )
  }

  createCampaignMembership(input: {
    campaignId: string
    userId: string
    role: CampaignRole
  }) {
    const key = this.key(input.campaignId, input.userId)
    if (this.memberships.has(key)) {
      return Promise.reject(new CampaignMembershipRepositoryConflictError())
    }
    const now = new Date('2026-08-15T00:00:00.000Z')
    const membership: CampaignMembershipRecord = {
      id: `membership-${++this.sequence}`,
      ...input,
      joinedAt: now,
      updatedAt: now,
    }
    this.memberships.set(key, membership)
    return Promise.resolve(membership)
  }

  updateCampaignMembershipRole(
    campaignId: string,
    userId: string,
    role: CampaignRole,
  ) {
    const membership = this.memberships.get(this.key(campaignId, userId))
    if (!membership) return Promise.resolve(null)
    const updated = { ...membership, role }
    this.memberships.set(this.key(campaignId, userId), updated)
    return Promise.resolve(updated)
  }

  hasActiveCampaignCharacterForUser(campaignId: string, userId: string) {
    return Promise.resolve(
      campaignId === CAMPAIGN_ID && this.activeCharacterUsers.has(userId),
    )
  }

  deleteCampaignMembership(campaignId: string, userId: string) {
    return Promise.resolve(
      this.memberships.delete(this.key(campaignId, userId)),
    )
  }

  private key(campaignId: string, userId: string) {
    return `${campaignId}:${userId}`
  }
}

describe('CampaignMembershipService', () => {
  let repository: InMemoryCampaignMembershipRepository
  let service: CampaignMembershipService

  beforeEach(async () => {
    repository = new InMemoryCampaignMembershipRepository()
    for (const userId of [
      OWNER_ID,
      GM_ID,
      ASSISTANT_ID,
      PLAYER_ID,
      SPECTATOR_ID,
      OUTSIDER_ID,
      TARGET_ID,
    ]) {
      repository.addUser(userId)
    }
    await repository.addMembership(OWNER_ID, 'GM')
    await repository.addMembership(GM_ID, 'GM')
    await repository.addMembership(ASSISTANT_ID, 'ASSISTANT_GM')
    await repository.addMembership(PLAYER_ID, 'PLAYER')
    await repository.addMembership(SPECTATOR_ID, 'SPECTATOR')
    service = new CampaignMembershipService(repository)
  })

  it.each<CampaignRole>(['GM', 'ASSISTANT_GM', 'PLAYER', 'SPECTATOR'])(
    'allows the owner to add a %s membership',
    async (role) => {
      await expect(
        service.addMember({
          actorUserId: OWNER_ID,
          campaignId: CAMPAIGN_ID,
          userId: TARGET_ID,
          role,
        }),
      ).resolves.toMatchObject({ role, userId: TARGET_ID })
    },
  )

  it('allows the owner to change and remove a non-owner membership', async () => {
    await expect(
      service.changeMemberRole({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: PLAYER_ID,
        role: 'ASSISTANT_GM',
      }),
    ).resolves.toMatchObject({ role: 'ASSISTANT_GM' })

    await expect(
      service.removeMember({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: PLAYER_ID,
      }),
    ).resolves.toBeUndefined()
  })

  it('blocks membership removal while the user still has active Character participation', async () => {
    repository.setActiveCharacter(PLAYER_ID, true)

    await expect(
      service.removeMember({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: PLAYER_ID,
      }),
    ).rejects.toMatchObject({
      code: 'CAMPAIGN_MEMBERSHIP_HAS_ACTIVE_CHARACTER',
    })

    await expect(
      repository.findCampaignMembership(CAMPAIGN_ID, PLAYER_ID),
    ).resolves.not.toBeNull()
  })

  it.each([GM_ID, ASSISTANT_ID, PLAYER_ID, SPECTATOR_ID, OUTSIDER_ID])(
    'rejects membership management by a non-owner (%s)',
    async (actorUserId) => {
      await expect(
        service.addMember({
          actorUserId,
          campaignId: CAMPAIGN_ID,
          userId: TARGET_ID,
          role: 'PLAYER',
        }),
      ).rejects.toMatchObject({ code: 'CAMPAIGN_MEMBERSHIP_FORBIDDEN' })
    },
  )

  it('rejects duplicate membership by preflight and unique conflict handling', async () => {
    await expect(
      service.addMember({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: PLAYER_ID,
        role: 'SPECTATOR',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_MEMBERSHIP_ALREADY_EXISTS' })
  })

  it('preserves the owner GM membership', async () => {
    await expect(
      service.changeMemberRole({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: OWNER_ID,
        role: 'PLAYER',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_OWNER_MUST_BE_GM' })

    await expect(
      service.removeMember({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: OWNER_ID,
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_OWNER_MUST_BE_GM' })
  })

  it('rejects missing Campaigns, users, memberships, and invalid roles', async () => {
    await expect(
      service.addMember({
        actorUserId: OWNER_ID,
        campaignId: 'missing-campaign',
        userId: TARGET_ID,
        role: 'PLAYER',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_NOT_FOUND' })

    await expect(
      service.addMember({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: 'missing-user',
        role: 'PLAYER',
      }),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' })

    await expect(
      service.changeMemberRole({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: TARGET_ID,
        role: 'PLAYER',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_MEMBERSHIP_NOT_FOUND' })

    await expect(
      service.addMember({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: TARGET_ID,
        role: 'OWNER' as CampaignRole,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CAMPAIGN_ROLE' })
  })
})
