import type { CampaignMembershipRepository } from '../campaigns/campaign-membership-repository'
import type { CampaignRole } from '../campaigns/campaign-role'
import type { WorldMembershipRepository } from '../worlds/world-membership-repository'
import type { WorldRole } from '../worlds/world-role'

export type MembershipInvitationKind = 'WORLD' | 'CAMPAIGN'

export interface MembershipInvitationWorldTarget {
  id: string
  name: string
}

export interface MembershipInvitationCampaignTarget {
  id: string
  name: string
  status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
  world: MembershipInvitationWorldTarget | null
}

export interface MembershipInvitationRecord {
  id: string
  kind: MembershipInvitationKind
  tokenHash: string
  worldId: string | null
  campaignId: string | null
  worldRole: WorldRole | null
  campaignRole: CampaignRole | null
  createdById: string
  acceptedById: string | null
  expiresAt: Date
  acceptedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
  updatedAt: Date
  world: MembershipInvitationWorldTarget | null
  campaign: MembershipInvitationCampaignTarget | null
}

export type CreateMembershipInvitationInput =
  | {
      kind: 'WORLD'
      tokenHash: string
      worldId: string
      worldRole: WorldRole
      createdById: string
      expiresAt: Date
    }
  | {
      kind: 'CAMPAIGN'
      tokenHash: string
      campaignId: string
      campaignRole: CampaignRole
      createdById: string
      expiresAt: Date
    }

export interface MembershipInvitationRepository {
  createInvitation(
    input: CreateMembershipInvitationInput,
  ): Promise<MembershipInvitationRecord>
  findInvitationByTokenHash(
    tokenHash: string,
  ): Promise<MembershipInvitationRecord | null>
  findInvitationById(
    invitationId: string,
  ): Promise<MembershipInvitationRecord | null>
  listWorldInvitations(worldId: string): Promise<MembershipInvitationRecord[]>
  listCampaignInvitations(
    campaignId: string,
  ): Promise<MembershipInvitationRecord[]>
  findWorldTarget(
    worldId: string,
  ): Promise<MembershipInvitationWorldTarget | null>
  findCampaignTarget(
    campaignId: string,
  ): Promise<MembershipInvitationCampaignTarget | null>
  claimInvitation(
    invitationId: string,
    acceptedById: string,
    acceptedAt: Date,
  ): Promise<boolean>
  revokeInvitation(invitationId: string, revokedAt: Date): Promise<boolean>
}

export interface MembershipInvitationTransactionContext {
  invitations: MembershipInvitationRepository
  worldMemberships: WorldMembershipRepository
  campaignMemberships: CampaignMembershipRepository
}

export interface MembershipInvitationUnitOfWork {
  runInTransaction<T>(
    operation: (
      context: MembershipInvitationTransactionContext,
    ) => Promise<T>,
  ): Promise<T>
}
