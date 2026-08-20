import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import { PrismaCampaignRepository } from '../campaigns/prisma-campaign-repository'
import { PrismaWorldMembershipRepository } from '../worlds/prisma-world-membership-repository'
import type {
  CreateMembershipInvitationInput,
  MembershipInvitationCampaignTarget,
  MembershipInvitationRecord,
  MembershipInvitationRepository,
  MembershipInvitationTransactionContext,
  MembershipInvitationUnitOfWork,
  MembershipInvitationWorldTarget,
} from './membership-invitation-repository'

type InvitationDatabaseClient = PrismaClient | Prisma.TransactionClient

type InvitationRow = {
  id: string
  kind: 'WORLD' | 'CAMPAIGN'
  tokenHash: string
  worldId: string | null
  campaignId: string | null
  worldRole: 'ADMIN' | 'MEMBER' | 'VIEWER' | null
  campaignRole: 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR' | null
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

function toInvitationRecord(value: InvitationRow): MembershipInvitationRecord {
  return value
}

const invitationSelection = {
  id: true,
  kind: true,
  tokenHash: true,
  worldId: true,
  campaignId: true,
  worldRole: true,
  campaignRole: true,
  createdById: true,
  acceptedById: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  world: { select: { id: true, name: true } },
  campaign: {
    select: {
      id: true,
      name: true,
      status: true,
      world: { select: { id: true, name: true } },
    },
  },
} as const

export class PrismaMembershipInvitationRepository implements MembershipInvitationRepository {
  constructor(private readonly client: InvitationDatabaseClient) {}

  async createInvitation(input: CreateMembershipInvitationInput) {
    const invitation = await this.client.membershipInvitation.create({
      data:
        input.kind === 'WORLD'
          ? {
              kind: input.kind,
              tokenHash: input.tokenHash,
              worldId: input.worldId,
              worldRole: input.worldRole,
              createdById: input.createdById,
              expiresAt: input.expiresAt,
            }
          : {
              kind: input.kind,
              tokenHash: input.tokenHash,
              campaignId: input.campaignId,
              campaignRole: input.campaignRole,
              createdById: input.createdById,
              expiresAt: input.expiresAt,
            },
      select: invitationSelection,
    })
    return toInvitationRecord(invitation)
  }

  async findInvitationByTokenHash(tokenHash: string) {
    const invitation = await this.client.membershipInvitation.findUnique({
      where: { tokenHash },
      select: invitationSelection,
    })
    return invitation ? toInvitationRecord(invitation) : null
  }

  async findInvitationById(invitationId: string) {
    const invitation = await this.client.membershipInvitation.findUnique({
      where: { id: invitationId },
      select: invitationSelection,
    })
    return invitation ? toInvitationRecord(invitation) : null
  }

  async listWorldInvitations(worldId: string) {
    const invitations = await this.client.membershipInvitation.findMany({
      where: { kind: 'WORLD', worldId },
      select: invitationSelection,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    })
    return invitations.map(toInvitationRecord)
  }

  async listCampaignInvitations(campaignId: string) {
    const invitations = await this.client.membershipInvitation.findMany({
      where: { kind: 'CAMPAIGN', campaignId },
      select: invitationSelection,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    })
    return invitations.map(toInvitationRecord)
  }

  findWorldTarget(worldId: string) {
    return this.client.world.findUnique({
      where: { id: worldId },
      select: { id: true, name: true },
    })
  }

  findCampaignTarget(campaignId: string) {
    return this.client.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        status: true,
        world: { select: { id: true, name: true } },
      },
    })
  }

  async claimInvitation(
    invitationId: string,
    acceptedById: string,
    acceptedAt: Date,
  ) {
    const result = await this.client.membershipInvitation.updateMany({
      where: {
        id: invitationId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: acceptedAt },
      },
      data: { acceptedAt, acceptedById },
    })
    return result.count === 1
  }

  async revokeInvitation(invitationId: string, revokedAt: Date) {
    const result = await this.client.membershipInvitation.updateMany({
      where: {
        id: invitationId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: revokedAt },
      },
      data: { revokedAt },
    })
    return result.count === 1
  }
}

export class PrismaMembershipInvitationUnitOfWork implements MembershipInvitationUnitOfWork {
  constructor(private readonly client: PrismaClient) {}

  runInTransaction<T>(
    operation: (context: MembershipInvitationTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((transaction) =>
      operation({
        invitations: new PrismaMembershipInvitationRepository(transaction),
        worldMemberships: new PrismaWorldMembershipRepository(
          this.client,
          transaction,
        ),
        campaignMemberships: new PrismaCampaignRepository(
          this.client,
          transaction,
        ),
      }),
    )
  }
}
