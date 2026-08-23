import { describe, expect, it } from 'vitest'
import type {
  CampaignMembershipCampaignReference,
  CampaignMembershipRecord,
  CampaignMembershipRepository,
  CreateCampaignMembershipInput,
} from '../campaigns/campaign-membership-repository'
import type { CampaignRole } from '../campaigns/campaign-role'
import type {
  CreateWorldMembershipInput,
  WorldMembershipRecord,
  WorldMembershipRepository,
  WorldReference,
} from '../worlds/world-membership-repository'
import type { WorldRole } from '../worlds/world-role'
import { MembershipInvitationDomainError } from './membership-invitation-errors'
import type {
  CreateMembershipInvitationInput,
  MembershipInvitationCampaignTarget,
  MembershipInvitationRecord,
  MembershipInvitationRepository,
  MembershipInvitationTransactionContext,
  MembershipInvitationUnitOfWork,
  MembershipInvitationWorldTarget,
} from './membership-invitation-repository'
import {
  MembershipInvitationService,
  hashMembershipInvitationToken,
  membershipInvitationStatus,
} from './membership-invitation-service'

const now = new Date('2026-08-20T00:00:00.000Z')
const ownerId = '21000000-0000-4000-8000-000000000001'
const adminId = '21000000-0000-4000-8000-000000000002'
const memberId = '21000000-0000-4000-8000-000000000003'
const inviteeId = '21000000-0000-4000-8000-000000000004'
const replacementOwnerId = '21000000-0000-4000-8000-000000000005'
const worldId = '21000000-0000-4000-8000-000000000010'
const campaignId = '21000000-0000-4000-8000-000000000020'

const tokenA = 'A'.repeat(43)
const tokenB = 'B'.repeat(43)
const tokenC = 'C'.repeat(43)

function clone<T>(value: T): T {
  return structuredClone(value)
}

class FakeWorldMembershipRepository implements WorldMembershipRepository {
  worlds = new Map<string, WorldReference>()
  users = new Set<string>()
  memberships = new Map<string, WorldMembershipRecord>()

  private key(targetWorldId: string, userId: string) {
    return `${targetWorldId}:${userId}`
  }

  findWorldById(targetWorldId: string) {
    return Promise.resolve(this.worlds.get(targetWorldId) ?? null)
  }

  userExists(userId: string) {
    return Promise.resolve(this.users.has(userId))
  }

  findMembership(targetWorldId: string, userId: string) {
    return Promise.resolve(
      this.memberships.get(this.key(targetWorldId, userId)) ?? null,
    )
  }

  createMembership(input: CreateWorldMembershipInput) {
    const record: WorldMembershipRecord = {
      id: `world-membership-${this.memberships.size + 1}`,
      ...input,
      joinedAt: now,
      updatedAt: now,
    }
    this.memberships.set(this.key(input.worldId, input.userId), record)
    return Promise.resolve(record)
  }

  updateMembershipRole(targetWorldId: string, userId: string, role: WorldRole) {
    const key = this.key(targetWorldId, userId)
    const current = this.memberships.get(key)
    if (!current) return Promise.resolve(null)
    const updated = { ...current, role, updatedAt: now }
    this.memberships.set(key, updated)
    return Promise.resolve(updated)
  }

  deleteMembership(targetWorldId: string, userId: string) {
    return Promise.resolve(
      this.memberships.delete(this.key(targetWorldId, userId)),
    )
  }
}

class FakeCampaignMembershipRepository implements CampaignMembershipRepository {
  campaigns = new Map<string, CampaignMembershipCampaignReference>()
  users = new Set<string>()
  memberships = new Map<string, CampaignMembershipRecord>()

  private key(targetCampaignId: string, userId: string) {
    return `${targetCampaignId}:${userId}`
  }

  findCampaignById(targetCampaignId: string) {
    return Promise.resolve(this.campaigns.get(targetCampaignId) ?? null)
  }

  userExists(userId: string) {
    return Promise.resolve(this.users.has(userId))
  }

  findCampaignMembership(targetCampaignId: string, userId: string) {
    return Promise.resolve(
      this.memberships.get(this.key(targetCampaignId, userId)) ?? null,
    )
  }

  createCampaignMembership(input: CreateCampaignMembershipInput) {
    const record: CampaignMembershipRecord = {
      id: `campaign-membership-${this.memberships.size + 1}`,
      ...input,
      capabilities: [],
      joinedAt: now,
      updatedAt: now,
    }
    this.memberships.set(this.key(input.campaignId, input.userId), record)
    return Promise.resolve(record)
  }

  updateCampaignMembershipRole(
    targetCampaignId: string,
    userId: string,
    role: CampaignRole,
  ) {
    const key = this.key(targetCampaignId, userId)
    const current = this.memberships.get(key)
    if (!current) return Promise.resolve(null)
    const updated = { ...current, role, updatedAt: now }
    this.memberships.set(key, updated)
    return Promise.resolve(updated)
  }

  updateCampaignMembershipCapabilities(
    targetCampaignId: string,
    userId: string,
    capabilities: CampaignMembershipRecord['capabilities'],
  ) {
    const key = this.key(targetCampaignId, userId)
    const current = this.memberships.get(key)
    if (!current) return Promise.resolve(null)
    const updated = { ...current, capabilities, updatedAt: now }
    this.memberships.set(key, updated)
    return Promise.resolve(updated)
  }

  deleteCampaignMembership(targetCampaignId: string, userId: string) {
    return Promise.resolve(
      this.memberships.delete(this.key(targetCampaignId, userId)),
    )
  }
}

class FakeInvitationRepository implements MembershipInvitationRepository {
  invitations = new Map<string, MembershipInvitationRecord>()
  worldTargets = new Map<string, MembershipInvitationWorldTarget>()
  campaignTargets = new Map<string, MembershipInvitationCampaignTarget>()

  async createInvitation(input: CreateMembershipInvitationInput) {
    const id = `invitation-${this.invitations.size + 1}`
    const base = {
      id,
      tokenHash: input.tokenHash,
      createdById: input.createdById,
      acceptedById: null,
      expiresAt: input.expiresAt,
      acceptedAt: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    const invitation: MembershipInvitationRecord =
      input.kind === 'WORLD'
        ? {
            ...base,
            kind: 'WORLD',
            worldId: input.worldId,
            campaignId: null,
            worldRole: input.worldRole,
            campaignRole: null,
            world: this.worldTargets.get(input.worldId) ?? null,
            campaign: null,
          }
        : {
            ...base,
            kind: 'CAMPAIGN',
            worldId: null,
            campaignId: input.campaignId,
            worldRole: null,
            campaignRole: input.campaignRole,
            world: null,
            campaign: this.campaignTargets.get(input.campaignId) ?? null,
          }
    this.invitations.set(id, invitation)
    return invitation
  }

  findInvitationByTokenHash(tokenHash: string) {
    return Promise.resolve(
      [...this.invitations.values()].find(
        (invitation) => invitation.tokenHash === tokenHash,
      ) ?? null,
    )
  }

  findInvitationById(invitationId: string) {
    return Promise.resolve(this.invitations.get(invitationId) ?? null)
  }

  listWorldInvitations(targetWorldId: string) {
    return Promise.resolve(
      [...this.invitations.values()].filter(
        (invitation) => invitation.worldId === targetWorldId,
      ),
    )
  }

  listCampaignInvitations(targetCampaignId: string) {
    return Promise.resolve(
      [...this.invitations.values()].filter(
        (invitation) => invitation.campaignId === targetCampaignId,
      ),
    )
  }

  findWorldTarget(targetWorldId: string) {
    return Promise.resolve(this.worldTargets.get(targetWorldId) ?? null)
  }

  findCampaignTarget(targetCampaignId: string) {
    return Promise.resolve(this.campaignTargets.get(targetCampaignId) ?? null)
  }

  async claimInvitation(
    invitationId: string,
    acceptedById: string,
    acceptedAt: Date,
  ) {
    const invitation = this.invitations.get(invitationId)
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt.getTime() <= acceptedAt.getTime()
    ) {
      return false
    }
    this.invitations.set(invitationId, {
      ...invitation,
      acceptedById,
      acceptedAt,
      updatedAt: acceptedAt,
    })
    return true
  }

  async revokeInvitation(invitationId: string, revokedAt: Date) {
    const invitation = this.invitations.get(invitationId)
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt.getTime() <= revokedAt.getTime()
    ) {
      return false
    }
    this.invitations.set(invitationId, {
      ...invitation,
      revokedAt,
      updatedAt: revokedAt,
    })
    return true
  }
}

class FakeUnitOfWork implements MembershipInvitationUnitOfWork {
  constructor(
    readonly invitations: FakeInvitationRepository,
    readonly worldMemberships: FakeWorldMembershipRepository,
    readonly campaignMemberships: FakeCampaignMembershipRepository,
  ) {}

  async runInTransaction<T>(
    operation: (context: MembershipInvitationTransactionContext) => Promise<T>,
  ) {
    const invitationSnapshot = clone([
      ...this.invitations.invitations.entries(),
    ])
    const worldMembershipSnapshot = clone([
      ...this.worldMemberships.memberships.entries(),
    ])
    const campaignMembershipSnapshot = clone([
      ...this.campaignMemberships.memberships.entries(),
    ])

    try {
      return await operation({
        invitations: this.invitations,
        worldMemberships: this.worldMemberships,
        campaignMemberships: this.campaignMemberships,
      })
    } catch (error) {
      this.invitations.invitations = new Map(invitationSnapshot)
      this.worldMemberships.memberships = new Map(worldMembershipSnapshot)
      this.campaignMemberships.memberships = new Map(campaignMembershipSnapshot)
      throw error
    }
  }
}

function fixture() {
  const invitations = new FakeInvitationRepository()
  const worldMemberships = new FakeWorldMembershipRepository()
  const campaignMemberships = new FakeCampaignMembershipRepository()

  invitations.worldTargets.set(worldId, { id: worldId, name: 'Ansalon' })
  invitations.campaignTargets.set(campaignId, {
    id: campaignId,
    name: 'Rabbit Riders',
    status: 'ACTIVE',
    world: { id: worldId, name: 'Ansalon' },
  })
  worldMemberships.worlds.set(worldId, { id: worldId, ownerId })
  worldMemberships.users.add(inviteeId)
  worldMemberships.memberships.set(`${worldId}:${adminId}`, {
    id: 'admin-membership',
    worldId,
    userId: adminId,
    role: 'ADMIN',
    joinedAt: now,
    updatedAt: now,
  })
  worldMemberships.memberships.set(`${worldId}:${memberId}`, {
    id: 'member-membership',
    worldId,
    userId: memberId,
    role: 'MEMBER',
    joinedAt: now,
    updatedAt: now,
  })

  campaignMemberships.campaigns.set(campaignId, { id: campaignId, ownerId })
  campaignMemberships.users.add(inviteeId)
  campaignMemberships.memberships.set(`${campaignId}:${adminId}`, {
    id: 'campaign-gm-membership',
    campaignId,
    userId: adminId,
    role: 'GM',
    capabilities: [],
    joinedAt: now,
    updatedAt: now,
  })

  const unitOfWork = new FakeUnitOfWork(
    invitations,
    worldMemberships,
    campaignMemberships,
  )

  return { invitations, worldMemberships, campaignMemberships, unitOfWork }
}

function service(
  unitOfWork: MembershipInvitationUnitOfWork,
  token = tokenA,
  clock = () => now,
) {
  return new MembershipInvitationService(unitOfWork, clock, () => token)
}

describe('MembershipInvitationService', () => {
  it('stores only a hash of the raw World invitation token', async () => {
    const state = fixture()
    const result = await service(state.unitOfWork).createWorldInvitation({
      actorUserId: ownerId,
      worldId,
      role: 'MEMBER',
    })

    expect(result.token).toBe(tokenA)
    const persisted = [...state.invitations.invitations.values()][0]
    expect(persisted.tokenHash).toBe(hashMembershipInvitationToken(tokenA))
    expect(persisted.tokenHash).not.toBe(tokenA)
    expect(result.invitation).toMatchObject({
      kind: 'WORLD',
      role: 'MEMBER',
      targetName: 'Ansalon',
      status: 'ACTIVE',
    })
  })

  it('allows a World ADMIN to create an invitation but rejects a normal MEMBER', async () => {
    const adminState = fixture()
    await expect(
      service(adminState.unitOfWork).createWorldInvitation({
        actorUserId: adminId,
        worldId,
        role: 'VIEWER',
      }),
    ).resolves.toMatchObject({
      invitation: { kind: 'WORLD', role: 'VIEWER' },
    })

    const memberState = fixture()
    await expect(
      service(memberState.unitOfWork).createWorldInvitation({
        actorUserId: memberId,
        worldId,
        role: 'VIEWER',
      }),
    ).rejects.toMatchObject({ name: 'WorldDomainError' })
  })

  it('keeps Campaign invitation management owner-only even for a GM', async () => {
    const state = fixture()
    await expect(
      service(state.unitOfWork).createCampaignInvitation({
        actorUserId: adminId,
        campaignId,
        role: 'PLAYER',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_MEMBERSHIP_FORBIDDEN' })
  })

  it('accepts a Campaign PLAYER invitation without creating World membership', async () => {
    const state = fixture()
    await service(state.unitOfWork, tokenB).createCampaignInvitation({
      actorUserId: ownerId,
      campaignId,
      role: 'PLAYER',
    })

    await expect(
      service(state.unitOfWork, tokenC).acceptInvitation({
        userId: inviteeId,
        token: tokenB,
      }),
    ).resolves.toEqual({
      kind: 'CAMPAIGN',
      worldId,
      campaignId,
      role: 'PLAYER',
    })

    expect(
      state.campaignMemberships.memberships.get(`${campaignId}:${inviteeId}`),
    ).toMatchObject({ role: 'PLAYER' })
    expect(
      state.worldMemberships.memberships.get(`${worldId}:${inviteeId}`),
    ).toBeUndefined()
  })

  it('accepts a Campaign Threadwatcher invitation with World VIEWER access', async () => {
    const state = fixture()
    await service(state.unitOfWork, tokenB).createCampaignInvitation({
      actorUserId: ownerId,
      campaignId,
      role: 'SPECTATOR',
    })

    await expect(
      service(state.unitOfWork, tokenC).acceptInvitation({
        userId: inviteeId,
        token: tokenB,
      }),
    ).resolves.toEqual({
      kind: 'CAMPAIGN',
      worldId,
      campaignId,
      role: 'SPECTATOR',
    })

    expect(
      state.campaignMemberships.memberships.get(`${campaignId}:${inviteeId}`),
    ).toMatchObject({ role: 'SPECTATOR' })
    expect(
      state.worldMemberships.memberships.get(`${worldId}:${inviteeId}`),
    ).toMatchObject({ role: 'VIEWER' })
  })

  it('does not downgrade stronger World access when accepting a Threadwatcher invitation', async () => {
    const state = fixture()
    state.worldMemberships.memberships.set(`${worldId}:${inviteeId}`, {
      id: 'existing-world-membership',
      worldId,
      userId: inviteeId,
      role: 'MEMBER',
      joinedAt: now,
      updatedAt: now,
    })
    await service(state.unitOfWork, tokenB).createCampaignInvitation({
      actorUserId: ownerId,
      campaignId,
      role: 'SPECTATOR',
    })

    await service(state.unitOfWork, tokenC).acceptInvitation({
      userId: inviteeId,
      token: tokenB,
    })

    expect(
      state.worldMemberships.memberships.get(`${worldId}:${inviteeId}`),
    ).toMatchObject({ role: 'MEMBER' })
  })

  it('consumes a single-use invitation only once', async () => {
    const state = fixture()
    await service(state.unitOfWork).createWorldInvitation({
      actorUserId: ownerId,
      worldId,
      role: 'MEMBER',
    })

    await service(state.unitOfWork).acceptInvitation({
      userId: inviteeId,
      token: tokenA,
    })

    await expect(
      service(state.unitOfWork).acceptInvitation({
        userId: replacementOwnerId,
        token: tokenA,
      }),
    ).rejects.toMatchObject({ code: 'INVITATION_ALREADY_USED' })
  })

  it('rejects revoked and expired invitations', async () => {
    const revokedState = fixture()
    const created = await service(
      revokedState.unitOfWork,
    ).createWorldInvitation({
      actorUserId: ownerId,
      worldId,
      role: 'MEMBER',
    })
    await service(revokedState.unitOfWork).revokeInvitation({
      actorUserId: ownerId,
      invitationId: created.invitation.id,
    })
    await expect(
      service(revokedState.unitOfWork).acceptInvitation({
        userId: inviteeId,
        token: tokenA,
      }),
    ).rejects.toMatchObject({ code: 'INVITATION_REVOKED' })

    const expiredState = fixture()
    await service(expiredState.unitOfWork).createWorldInvitation({
      actorUserId: ownerId,
      worldId,
      role: 'MEMBER',
    })
    const afterExpiry = new Date('2026-08-28T00:00:00.000Z')
    await expect(
      service(
        expiredState.unitOfWork,
        tokenC,
        () => afterExpiry,
      ).acceptInvitation({
        userId: inviteeId,
        token: tokenA,
      }),
    ).rejects.toMatchObject({ code: 'INVITATION_EXPIRED' })
  })

  it('revalidates the inviter authority at acceptance and rolls back consumption', async () => {
    const state = fixture()
    await service(state.unitOfWork).createWorldInvitation({
      actorUserId: ownerId,
      worldId,
      role: 'MEMBER',
    })

    state.worldMemberships.worlds.set(worldId, {
      id: worldId,
      ownerId: replacementOwnerId,
    })

    await expect(
      service(state.unitOfWork).acceptInvitation({
        userId: inviteeId,
        token: tokenA,
      }),
    ).rejects.toMatchObject({ name: 'WorldDomainError' })

    const invitation = await state.invitations.findInvitationByTokenHash(
      hashMembershipInvitationToken(tokenA),
    )
    expect(invitation).not.toBeNull()
    expect(membershipInvitationStatus(invitation!, now)).toBe('ACTIVE')
  })

  it('rejects malformed bearer tokens before repository lookup', async () => {
    const state = fixture()
    await expect(
      service(state.unitOfWork).previewInvitation('not-a-valid-token'),
    ).rejects.toBeInstanceOf(MembershipInvitationDomainError)
  })
})
