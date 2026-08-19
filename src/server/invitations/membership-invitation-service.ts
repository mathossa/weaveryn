import { createHash, randomBytes } from 'node:crypto'
import {
  CampaignMembershipService,
  assertCampaignMembershipManager,
} from '../campaigns/campaign-membership-service'
import { assertCampaignRole, type CampaignRole } from '../campaigns/campaign-role'
import { WorldMembershipService } from '../worlds/world-membership-service'
import {
  WORLD_PERMISSIONS,
  WorldAuthorizationService,
} from '../worlds/world-permissions'
import { assertWorldRole, type WorldRole } from '../worlds/world-role'
import {
  invitationAlreadyUsed,
  invitationExpired,
  invitationInvalidToken,
  invitationNotFound,
  invitationRevoked,
  invitationTargetUnavailable,
} from './membership-invitation-errors'
import type {
  MembershipInvitationRecord,
  MembershipInvitationUnitOfWork,
} from './membership-invitation-repository'

const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
export const MEMBERSHIP_INVITATION_LIFETIME_DAYS = 7
const INVITATION_LIFETIME_MS =
  MEMBERSHIP_INVITATION_LIFETIME_DAYS * 24 * 60 * 60 * 1000

export type MembershipInvitationStatus =
  | 'ACTIVE'
  | 'ACCEPTED'
  | 'REVOKED'
  | 'EXPIRED'

export interface MembershipInvitationView {
  id: string
  kind: 'WORLD' | 'CAMPAIGN'
  role: WorldRole | CampaignRole
  targetName: string
  worldName: string | null
  status: MembershipInvitationStatus
  expiresAt: Date
  createdAt: Date
}

export interface CreatedMembershipInvitation {
  token: string
  invitation: MembershipInvitationView
}

export type AcceptedMembershipInvitation =
  | {
      kind: 'WORLD'
      worldId: string
      role: WorldRole
    }
  | {
      kind: 'CAMPAIGN'
      worldId: string
      campaignId: string
      role: CampaignRole
    }

export type MembershipInvitationClock = () => Date
export type MembershipInvitationTokenFactory = () => string

function generateInvitationToken() {
  return randomBytes(32).toString('base64url')
}

export function hashMembershipInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function normalizeMembershipInvitationToken(value: unknown) {
  if (typeof value !== 'string') throw invitationInvalidToken()
  const token = value.trim()
  if (!INVITATION_TOKEN_PATTERN.test(token)) throw invitationInvalidToken()
  return token
}

export function membershipInvitationStatus(
  invitation: MembershipInvitationRecord,
  now: Date,
): MembershipInvitationStatus {
  if (invitation.acceptedAt) return 'ACCEPTED'
  if (invitation.revokedAt) return 'REVOKED'
  if (invitation.expiresAt.getTime() <= now.getTime()) return 'EXPIRED'
  return 'ACTIVE'
}

function assertInvitationActive(
  invitation: MembershipInvitationRecord,
  now: Date,
) {
  const status = membershipInvitationStatus(invitation, now)
  if (status === 'ACTIVE') return
  if (status === 'ACCEPTED') throw invitationAlreadyUsed()
  if (status === 'REVOKED') throw invitationRevoked()
  throw invitationExpired()
}

function invitationView(
  invitation: MembershipInvitationRecord,
  now: Date,
): MembershipInvitationView {
  if (
    invitation.kind === 'WORLD' &&
    invitation.world &&
    invitation.worldRole
  ) {
    return {
      id: invitation.id,
      kind: 'WORLD',
      role: invitation.worldRole,
      targetName: invitation.world.name,
      worldName: invitation.world.name,
      status: membershipInvitationStatus(invitation, now),
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    }
  }

  if (
    invitation.kind === 'CAMPAIGN' &&
    invitation.campaign &&
    invitation.campaignRole
  ) {
    return {
      id: invitation.id,
      kind: 'CAMPAIGN',
      role: invitation.campaignRole,
      targetName: invitation.campaign.name,
      worldName: invitation.campaign.world?.name ?? null,
      status: membershipInvitationStatus(invitation, now),
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    }
  }

  throw invitationTargetUnavailable()
}

export class MembershipInvitationService {
  constructor(
    private readonly unitOfWork: MembershipInvitationUnitOfWork,
    private readonly clock: MembershipInvitationClock = () => new Date(),
    private readonly tokenFactory: MembershipInvitationTokenFactory =
      generateInvitationToken,
  ) {}

  async createWorldInvitation(input: {
    actorUserId: string
    worldId: string
    role: WorldRole
  }): Promise<CreatedMembershipInvitation> {
    assertWorldRole(input.role)
    const token = normalizeMembershipInvitationToken(this.tokenFactory())
    const now = this.clock()
    const expiresAt = new Date(now.getTime() + INVITATION_LIFETIME_MS)

    const invitation = await this.unitOfWork.runInTransaction(async (context) => {
      const authorization = new WorldAuthorizationService(
        context.worldMemberships,
      )
      await authorization.assertPermission(
        input.actorUserId,
        input.worldId,
        WORLD_PERMISSIONS.MANAGE_MEMBERS,
      )

      if (!(await context.invitations.findWorldTarget(input.worldId))) {
        throw invitationTargetUnavailable()
      }

      return context.invitations.createInvitation({
        kind: 'WORLD',
        tokenHash: hashMembershipInvitationToken(token),
        worldId: input.worldId,
        worldRole: input.role,
        createdById: input.actorUserId,
        expiresAt,
      })
    })

    return { token, invitation: invitationView(invitation, now) }
  }

  async createCampaignInvitation(input: {
    actorUserId: string
    campaignId: string
    role: CampaignRole
  }): Promise<CreatedMembershipInvitation> {
    assertCampaignRole(input.role)
    const token = normalizeMembershipInvitationToken(this.tokenFactory())
    const now = this.clock()
    const expiresAt = new Date(now.getTime() + INVITATION_LIFETIME_MS)

    const invitation = await this.unitOfWork.runInTransaction(async (context) => {
      await assertCampaignMembershipManager(
        context.campaignMemberships,
        input.actorUserId,
        input.campaignId,
      )
      const campaign = await context.invitations.findCampaignTarget(
        input.campaignId,
      )
      if (!campaign || campaign.status !== 'ACTIVE' || !campaign.world) {
        throw invitationTargetUnavailable()
      }

      return context.invitations.createInvitation({
        kind: 'CAMPAIGN',
        tokenHash: hashMembershipInvitationToken(token),
        campaignId: input.campaignId,
        campaignRole: input.role,
        createdById: input.actorUserId,
        expiresAt,
      })
    })

    return { token, invitation: invitationView(invitation, now) }
  }

  async listWorldInvitations(input: {
    actorUserId: string
    worldId: string
  }): Promise<MembershipInvitationView[]> {
    const now = this.clock()
    return this.unitOfWork.runInTransaction(async (context) => {
      const authorization = new WorldAuthorizationService(
        context.worldMemberships,
      )
      await authorization.assertPermission(
        input.actorUserId,
        input.worldId,
        WORLD_PERMISSIONS.MANAGE_MEMBERS,
      )
      const invitations = await context.invitations.listWorldInvitations(
        input.worldId,
      )
      return invitations
        .map((invitation) => invitationView(invitation, now))
        .filter((invitation) => invitation.status === 'ACTIVE')
    })
  }

  async listCampaignInvitations(input: {
    actorUserId: string
    campaignId: string
  }): Promise<MembershipInvitationView[]> {
    const now = this.clock()
    return this.unitOfWork.runInTransaction(async (context) => {
      await assertCampaignMembershipManager(
        context.campaignMemberships,
        input.actorUserId,
        input.campaignId,
      )
      const invitations = await context.invitations.listCampaignInvitations(
        input.campaignId,
      )
      return invitations
        .map((invitation) => invitationView(invitation, now))
        .filter((invitation) => invitation.status === 'ACTIVE')
    })
  }

  async previewInvitation(tokenInput: unknown): Promise<MembershipInvitationView> {
    const token = normalizeMembershipInvitationToken(tokenInput)
    const now = this.clock()
    return this.unitOfWork.runInTransaction(async (context) => {
      const invitation = await context.invitations.findInvitationByTokenHash(
        hashMembershipInvitationToken(token),
      )
      if (!invitation) throw invitationNotFound()
      return invitationView(invitation, now)
    })
  }

  async revokeInvitation(input: {
    actorUserId: string
    invitationId: string
  }): Promise<void> {
    const now = this.clock()
    await this.unitOfWork.runInTransaction(async (context) => {
      const invitation = await context.invitations.findInvitationById(
        input.invitationId,
      )
      if (!invitation) throw invitationNotFound()

      if (invitation.kind === 'WORLD' && invitation.worldId) {
        const authorization = new WorldAuthorizationService(
          context.worldMemberships,
        )
        await authorization.assertPermission(
          input.actorUserId,
          invitation.worldId,
          WORLD_PERMISSIONS.MANAGE_MEMBERS,
        )
      } else if (invitation.kind === 'CAMPAIGN' && invitation.campaignId) {
        await assertCampaignMembershipManager(
          context.campaignMemberships,
          input.actorUserId,
          invitation.campaignId,
        )
      } else {
        throw invitationTargetUnavailable()
      }

      const status = membershipInvitationStatus(invitation, now)
      if (status === 'REVOKED') return
      if (status === 'ACCEPTED') throw invitationAlreadyUsed()
      if (status === 'EXPIRED') throw invitationExpired()

      if (!(await context.invitations.revokeInvitation(invitation.id, now))) {
        const current = await context.invitations.findInvitationById(
          invitation.id,
        )
        if (!current) throw invitationNotFound()
        assertInvitationActive(current, now)
        throw invitationRevoked()
      }
    })
  }

  async acceptInvitation(input: {
    userId: string
    token: unknown
  }): Promise<AcceptedMembershipInvitation> {
    const token = normalizeMembershipInvitationToken(input.token)
    const now = this.clock()

    return this.unitOfWork.runInTransaction(async (context) => {
      const invitation = await context.invitations.findInvitationByTokenHash(
        hashMembershipInvitationToken(token),
      )
      if (!invitation) throw invitationNotFound()
      assertInvitationActive(invitation, now)

      if (
        !(await context.invitations.claimInvitation(
          invitation.id,
          input.userId,
          now,
        ))
      ) {
        const current = await context.invitations.findInvitationById(
          invitation.id,
        )
        if (!current) throw invitationNotFound()
        assertInvitationActive(current, now)
        throw invitationAlreadyUsed()
      }

      if (
        invitation.kind === 'WORLD' &&
        invitation.worldId &&
        invitation.worldRole &&
        invitation.world
      ) {
        const membershipService = new WorldMembershipService(
          context.worldMemberships,
        )
        await membershipService.addMember({
          actorUserId: invitation.createdById,
          worldId: invitation.worldId,
          userId: input.userId,
          role: invitation.worldRole,
        })
        return {
          kind: 'WORLD',
          worldId: invitation.worldId,
          role: invitation.worldRole,
        }
      }

      if (
        invitation.kind === 'CAMPAIGN' &&
        invitation.campaignId &&
        invitation.campaignRole &&
        invitation.campaign?.status === 'ACTIVE' &&
        invitation.campaign.world
      ) {
        const membershipService = new CampaignMembershipService(
          context.campaignMemberships,
        )
        await membershipService.addMember({
          actorUserId: invitation.createdById,
          campaignId: invitation.campaignId,
          userId: input.userId,
          role: invitation.campaignRole,
        })
        return {
          kind: 'CAMPAIGN',
          worldId: invitation.campaign.world.id,
          campaignId: invitation.campaignId,
          role: invitation.campaignRole,
        }
      }

      throw invitationTargetUnavailable()
    })
  }
}
