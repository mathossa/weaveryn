import { describe, expect, it } from 'vitest'
import { WorldDomainError } from '../worlds/world-errors'
import type { WorldRole } from '../worlds/world-role'
import { CampaignDomainError } from './campaign-errors'
import type {
  CampaignRecord,
  CampaignRepository,
  CreateCampaignRecordInput,
  UpdateCampaignRecordInput,
} from './campaign-repository'
import type {
  CampaignMembershipRecord,
  CreateCampaignMembershipInput,
} from './campaign-membership-repository'
import { CAMPAIGN_ROLES } from './campaign-role'
import { CampaignService } from './campaign-service'

const worldId = '00000000-0000-4000-8000-000000000001'
const timelineId = '00000000-0000-4000-8000-000000000002'
const ownerId = '00000000-0000-4000-8000-00000000000a'
const adminId = '00000000-0000-4000-8000-00000000000b'
const memberId = '00000000-0000-4000-8000-00000000000c'
const outsiderId = '00000000-0000-4000-8000-00000000000d'
const campaignMemberId = '00000000-0000-4000-8000-00000000000e'
const gmId = '00000000-0000-4000-8000-00000000000f'
const campaignId = '00000000-0000-4000-8000-000000000010'
const now = new Date('2026-08-15T00:00:00.000Z')

class InMemoryCampaignRepository implements CampaignRepository {
  world = { id: worldId, ownerId }
  memberships = new Map<string, WorldRole>([
    [adminId, 'ADMIN'],
    [memberId, 'MEMBER'],
  ])
  timeline: { id: string; worldId: string } | null = {
    id: timelineId,
    worldId,
  }
  campaigns: CampaignRecord[] = []
  campaignMemberships: CampaignMembershipRecord[] = []
  users = new Set([
    ownerId,
    adminId,
    memberId,
    outsiderId,
    campaignMemberId,
    gmId,
  ])
  failNextOwnerUpdate = false

  async runInTransaction<T>(
    operation: (repository: CampaignRepository) => Promise<T>,
  ): Promise<T> {
    const campaignSnapshot = structuredClone(this.campaigns)
    const membershipSnapshot = structuredClone(this.campaignMemberships)
    try {
      return await operation(this)
    } catch (error) {
      this.campaigns = campaignSnapshot
      this.campaignMemberships = membershipSnapshot
      throw error
    }
  }

  async findWorldById(requestedWorldId: string) {
    return requestedWorldId === this.world.id ? this.world : null
  }

  async findMembership(requestedWorldId: string, userId: string) {
    const role =
      requestedWorldId === this.world.id
        ? this.memberships.get(userId)
        : undefined

    return role
      ? {
          id: `${requestedWorldId}:${userId}`,
          worldId: requestedWorldId,
          userId,
          role,
          joinedAt: now,
          updatedAt: now,
        }
      : null
  }

  async findMainTimelineByWorldId(requestedWorldId: string) {
    return this.timeline?.worldId === requestedWorldId ? this.timeline : null
  }

  async createCampaign(input: CreateCampaignRecordInput) {
    const campaign: CampaignRecord = {
      ...input,
      description: input.description ?? null,
      archivedWorldSnapshot: null,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    }
    this.campaigns.push(campaign)
    return campaign
  }

  async createCampaignMembership(input: CreateCampaignMembershipInput) {
    const membership: CampaignMembershipRecord = {
      id: `${input.campaignId}:${input.userId}`,
      ...input,
      capabilities: [],
      joinedAt: now,
      updatedAt: now,
    }
    this.campaignMemberships.push(membership)
    return membership
  }

  async findCampaignById(requestedCampaignId: string) {
    const campaign = this.campaigns.find(
      (candidate) => candidate.id === requestedCampaignId,
    )
    return campaign
      ? {
          id: campaign.id,
          worldId: campaign.worldId,
          ownerId: campaign.ownerId,
          status: campaign.status,
        }
      : null
  }

  async userExists(userId: string) {
    return this.users.has(userId)
  }

  async findCampaignMembership(requestedCampaignId: string, userId: string) {
    return (
      this.campaignMemberships.find(
        (membership) =>
          membership.campaignId === requestedCampaignId &&
          membership.userId === userId,
      ) ?? null
    )
  }

  async upsertCampaignGmMembership(
    requestedCampaignId: string,
    userId: string,
  ) {
    const existing = await this.findCampaignMembership(
      requestedCampaignId,
      userId,
    )
    if (existing) {
      existing.role = 'GM'
      existing.capabilities = []
      existing.updatedAt = now
      return existing
    }
    return this.createCampaignMembership({
      campaignId: requestedCampaignId,
      userId,
      role: 'GM',
    })
  }

  async updateCampaignOwner(
    requestedCampaignId: string,
    requestedWorldId: string | null,
    currentOwnerId: string,
    newOwnerId: string,
  ) {
    if (this.failNextOwnerUpdate) {
      this.failNextOwnerUpdate = false
      return null
    }
    const campaign = this.campaigns.find(
      (candidate) =>
        candidate.id === requestedCampaignId &&
        candidate.worldId === requestedWorldId &&
        candidate.ownerId === currentOwnerId &&
        candidate.status !== 'ARCHIVED',
    )
    if (!campaign) return null
    campaign.ownerId = newOwnerId
    campaign.updatedAt = now
    return campaign
  }

  async updateCampaignStatus(
    requestedCampaignId: string,
    requestedWorldId: string | null,
    requestedOwnerId: string,
    currentStatus: CampaignRecord['status'],
    newStatus: CampaignRecord['status'],
  ) {
    const campaign = this.campaigns.find(
      (candidate) =>
        candidate.id === requestedCampaignId &&
        candidate.worldId === requestedWorldId &&
        candidate.ownerId === requestedOwnerId &&
        candidate.status === currentStatus,
    )
    if (!campaign) return null
    campaign.status = newStatus
    campaign.updatedAt = now
    return campaign
  }

  async deleteOwnedCampaign(
    requestedCampaignId: string,
    requestedWorldId: string | null,
    requestedOwnerId: string,
  ) {
    const index = this.campaigns.findIndex(
      (candidate) =>
        candidate.id === requestedCampaignId &&
        candidate.worldId === requestedWorldId &&
        candidate.ownerId === requestedOwnerId,
    )
    if (index < 0) return false
    this.campaigns.splice(index, 1)
    this.campaignMemberships = this.campaignMemberships.filter(
      (membership) => membership.campaignId !== requestedCampaignId,
    )
    return true
  }

  async findCampaignForUser(requestedCampaignId: string, userId: string) {
    return (
      this.campaigns.find(
        (campaign) =>
          campaign.id === requestedCampaignId &&
          (campaign.ownerId === userId ||
            this.campaignMemberships.some(
              (membership) =>
                membership.campaignId === requestedCampaignId &&
                membership.userId === userId,
            )),
      ) ?? null
    )
  }

  async listCampaignsForUser(userId: string) {
    return this.campaigns.filter(
      (campaign) =>
        campaign.ownerId === userId ||
        this.campaignMemberships.some(
          (membership) =>
            membership.campaignId === campaign.id &&
            membership.userId === userId,
        ),
    )
  }

  async updateOwnedCampaign(
    requestedCampaignId: string,
    requestedOwnerId: string,
    input: UpdateCampaignRecordInput,
  ) {
    const campaign = this.campaigns.find(
      (candidate) =>
        candidate.id === requestedCampaignId &&
        candidate.ownerId === requestedOwnerId &&
        candidate.status !== 'ARCHIVED',
    )

    if (!campaign) return null
    Object.assign(campaign, input, { updatedAt: now })
    return campaign
  }

  async findCampaignManagementAccess(
    requestedCampaignId: string,
    userId: string,
  ) {
    const campaign = this.campaigns.find(
      (candidate) => candidate.id === requestedCampaignId,
    )
    if (!campaign) return null
    const membership = this.campaignMemberships.find(
      (candidate) =>
        candidate.campaignId === requestedCampaignId &&
        candidate.userId === userId,
    )
    if (campaign.ownerId !== userId && !membership) return null
    return {
      ownerId: campaign.ownerId,
      status: campaign.status,
      role: membership?.role ?? null,
    }
  }

  async updateManagedCampaign(
    requestedCampaignId: string,
    userId: string,
    input: UpdateCampaignRecordInput,
  ) {
    const campaign = this.campaigns.find(
      (candidate) =>
        candidate.id === requestedCampaignId && candidate.status !== 'ARCHIVED',
    )
    if (!campaign) return null

    const membership = this.campaignMemberships.find(
      (candidate) =>
        candidate.campaignId === requestedCampaignId &&
        candidate.userId === userId,
    )
    const authorized =
      campaign.ownerId === userId ||
      membership?.role === 'GM' ||
      membership?.role === 'ASSISTANT_GM'
    if (!authorized) return null

    Object.assign(campaign, input, { updatedAt: now })
    return campaign
  }
}

function createHarness() {
  const repository = new InMemoryCampaignRepository()
  const service = new CampaignService(repository, () => campaignId)
  return { repository, service }
}

function createInput(creatorId: string) {
  return {
    creatorId,
    worldId,
    name: 'Ashes of Aldorath',
    description: 'A campaign at the edge of an empire.',
    currentWorldPosition: '142.5',
    currentWorldDateLabel: '14 Emberwane, 812',
  }
}

describe('CampaignService', () => {
  it('creates an active Campaign with a GM membership for its owner', async () => {
    const { repository, service } = createHarness()
    const campaign = await service.createCampaign(createInput(ownerId))

    expect(campaign).toMatchObject({
      id: campaignId,
      worldId,
      ownerId,
      timelineId,
      currentWorldPosition: '142.5',
      currentWorldDateLabel: '14 Emberwane, 812',
      status: 'ACTIVE',
    })
    expect(repository.campaignMemberships).toEqual([
      expect.objectContaining({ campaignId, userId: ownerId, role: 'GM' }),
    ])
  })

  it('allows a World ADMIN to create and independently own a Campaign', async () => {
    const { service } = createHarness()
    const campaign = await service.createCampaign(createInput(adminId))
    expect(campaign.ownerId).toBe(adminId)
    expect(campaign.ownerId).not.toBe(ownerId)
  })

  it('allows a World MEMBER to create and independently own a Campaign', async () => {
    const { repository, service } = createHarness()
    const campaign = await service.createCampaign(createInput(memberId))

    expect(campaign.ownerId).toBe(memberId)
    expect(campaign.ownerId).not.toBe(ownerId)
    expect(repository.campaignMemberships).toEqual([
      expect.objectContaining({ campaignId, userId: memberId, role: 'GM' }),
    ])
  })

  it('rejects Campaign creation by a non-member', async () => {
    const { repository, service } = createHarness()
    await expect(
      service.createCampaign(createInput(outsiderId)),
    ).rejects.toMatchObject({
      code: 'WORLD_PERMISSION_DENIED',
    } satisfies Partial<WorldDomainError>)
    expect(repository.campaigns).toHaveLength(0)
  })

  it('fails closed when the World has no main timeline', async () => {
    const { repository, service } = createHarness()
    repository.timeline = null
    await expect(
      service.createCampaign(createInput(ownerId)),
    ).rejects.toMatchObject({
      code: 'CAMPAIGN_MAIN_TIMELINE_NOT_FOUND',
    } satisfies Partial<CampaignDomainError>)
  })

  it('loads and lists Campaigns for a Campaign member without making them an owner', async () => {
    const { repository, service } = createHarness()
    const campaign = await service.createCampaign(createInput(adminId))
    await repository.createCampaignMembership({
      campaignId: campaign.id,
      userId: campaignMemberId,
      role: 'SPECTATOR',
    })

    await expect(
      service.loadCampaign(campaign.id, campaignMemberId),
    ).resolves.toBe(campaign)
    expect(campaign.ownerId).toBe(adminId)
  })

  it('allows the Campaign owner to update basic and temporal fields', async () => {
    const { service } = createHarness()
    const campaign = await service.createCampaign(createInput(adminId))
    const updated = await service.updateCampaign(campaign.id, adminId, {
      name: 'Ashes of Aldorath: Aftermath',
      currentWorldPosition: '148',
      currentWorldDateLabel: '20 Emberwane, 812',
    })
    expect(updated.name).toBe('Ashes of Aldorath: Aftermath')
  })

  it('allows GM and Assistant GM to update shared Campaign details but not the name', async () => {
    const { repository, service } = createHarness()
    const campaign = await service.createCampaign(createInput(adminId))
    await repository.createCampaignMembership({
      campaignId: campaign.id,
      userId: gmId,
      role: 'GM',
    })

    const updated = await service.updateCampaignManagement(campaign.id, gmId, {
      description: 'Updated by the GM.',
      currentWorldPosition: '150',
      currentWorldDateLabel: '22 Emberwane, 812',
    })
    expect(updated.description).toBe('Updated by the GM.')

    await expect(
      service.updateCampaignManagement(campaign.id, gmId, { name: 'Renamed' }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_UPDATE_FORBIDDEN' })
  })

  it('rejects player/spectator Campaign management updates', async () => {
    const { repository, service } = createHarness()
    const campaign = await service.createCampaign(createInput(adminId))
    await repository.createCampaignMembership({
      campaignId: campaign.id,
      userId: campaignMemberId,
      role: 'PLAYER',
    })

    await expect(
      service.updateCampaignManagement(campaign.id, campaignMemberId, {
        description: 'Nope',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_UPDATE_FORBIDDEN' })
  })

  it('rejects non-owner and archived owner-only Campaign updates', async () => {
    const { repository, service } = createHarness()
    const campaign = await service.createCampaign(createInput(adminId))
    await expect(
      service.updateCampaign(campaign.id, ownerId, { name: 'Taken over' }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_UPDATE_FORBIDDEN' })

    repository.campaigns[0]!.status = 'ARCHIVED'
    await expect(
      service.updateCampaign(campaign.id, adminId, { name: 'Reopened' }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_UPDATE_FORBIDDEN' })
  })

  it.each(['PLAYER', 'ASSISTANT_GM'] as const)(
    'promotes an existing %s membership to GM during ownership transfer',
    async (role) => {
      const { repository, service } = createHarness()
      const campaign = await service.createCampaign(createInput(adminId))
      await repository.createCampaignMembership({
        campaignId,
        userId: campaignMemberId,
        role,
      })

      const transferred = await service.transferOwnership({
        campaignId,
        worldId,
        actorUserId: adminId,
        targetUserId: campaignMemberId,
      })

      expect(transferred.ownerId).toBe(campaignMemberId)
      expect(
        await repository.findCampaignMembership(campaignId, campaignMemberId),
      ).toMatchObject({ role: 'GM', capabilities: [] })
      expect(
        await repository.findCampaignMembership(campaignId, adminId),
      ).toMatchObject({ role: 'GM' })
      expect(CAMPAIGN_ROLES).not.toContain('OWNER')
      expect(campaign.ownerId).toBe(campaignMemberId)
    },
  )

  it('creates a GM membership when ownership transfers to a non-member', async () => {
    const { repository, service } = createHarness()
    await service.createCampaign(createInput(adminId))

    await service.transferOwnership({
      campaignId,
      worldId,
      actorUserId: adminId,
      targetUserId: campaignMemberId,
    })

    expect(
      await repository.findCampaignMembership(campaignId, campaignMemberId),
    ).toMatchObject({ role: 'GM', capabilities: [] })
  })

  it('does not let the World owner or an unrelated user transfer Campaign ownership', async () => {
    const { service } = createHarness()
    await service.createCampaign(createInput(adminId))

    for (const actorUserId of [ownerId, outsiderId]) {
      await expect(
        service.transferOwnership({
          campaignId,
          worldId,
          actorUserId,
          targetUserId: campaignMemberId,
        }),
      ).rejects.toMatchObject({
        code: 'CAMPAIGN_OWNERSHIP_TRANSFER_FORBIDDEN',
      })
    }
  })

  it('rejects same-owner and archived ownership transfers', async () => {
    const { repository, service } = createHarness()
    await service.createCampaign(createInput(adminId))

    await expect(
      service.transferOwnership({
        campaignId,
        worldId,
        actorUserId: adminId,
        targetUserId: adminId,
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_SAME_OWNER' })

    repository.campaigns[0]!.status = 'ARCHIVED'
    await expect(
      service.transferOwnership({
        campaignId,
        worldId,
        actorUserId: adminId,
        targetUserId: campaignMemberId,
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_ARCHIVED_READ_ONLY' })
  })

  it('rolls back the membership promotion if the guarded owner update loses a race', async () => {
    const { repository, service } = createHarness()
    await service.createCampaign(createInput(adminId))
    await repository.createCampaignMembership({
      campaignId,
      userId: campaignMemberId,
      role: 'PLAYER',
    })
    repository.failNextOwnerUpdate = true

    await expect(
      service.transferOwnership({
        campaignId,
        worldId,
        actorUserId: adminId,
        targetUserId: campaignMemberId,
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_STATE_CHANGED' })

    expect(repository.campaigns[0]?.ownerId).toBe(adminId)
    expect(
      await repository.findCampaignMembership(campaignId, campaignMemberId),
    ).toMatchObject({ role: 'PLAYER' })
  })

  it('enforces owner-only ACTIVE to ENDED to ARCHIVED transitions', async () => {
    const { service } = createHarness()
    await service.createCampaign(createInput(adminId))

    await expect(
      service.endCampaign({ campaignId, worldId, actorUserId: ownerId }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_LIFECYCLE_FORBIDDEN' })

    await expect(
      service.archiveCampaign({
        campaignId,
        worldId,
        actorUserId: adminId,
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_INVALID_STATUS_TRANSITION' })

    await expect(
      service.endCampaign({ campaignId, worldId, actorUserId: adminId }),
    ).resolves.toMatchObject({ status: 'ENDED' })
    await expect(
      service.archiveCampaign({
        campaignId,
        worldId,
        actorUserId: adminId,
      }),
    ).resolves.toMatchObject({ status: 'ARCHIVED' })

    await expect(
      service.endCampaign({ campaignId, worldId, actorUserId: adminId }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_INVALID_STATUS_TRANSITION' })
  })

  it('allows only the Campaign owner to delete the Campaign scope', async () => {
    const { repository, service } = createHarness()
    await service.createCampaign(createInput(adminId))

    await expect(
      service.deleteCampaign({ campaignId, worldId, actorUserId: ownerId }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_DELETE_FORBIDDEN' })
    expect(repository.campaigns).toHaveLength(1)

    await service.deleteCampaign({
      campaignId,
      worldId,
      actorUserId: adminId,
    })
    expect(repository.campaigns).toHaveLength(0)
    expect(repository.campaignMemberships).toHaveLength(0)
  })
})
