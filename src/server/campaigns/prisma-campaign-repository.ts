import { Prisma, type PrismaClient } from '../../generated/prisma/client'
import { MAIN_WORLD_TIMELINE_NAME } from '../worlds/world-timelines'
import type { WorldMembershipRecord } from '../worlds/world-membership-repository'
import {
  CampaignMembershipRepositoryConflictError,
  type CampaignMembershipRecord,
  type CreateCampaignMembershipInput,
} from './campaign-membership-repository'
import type {
  CampaignManagementAccess,
  CampaignRecord,
  CampaignRepository,
  CampaignTimelineReference,
  CreateCampaignRecordInput,
  UpdateCampaignRecordInput,
} from './campaign-repository'
import type { CampaignCapability } from './campaign-capability'

type CampaignDatabaseClient = PrismaClient | Prisma.TransactionClient

function toCampaignRecord(campaign: {
  id: string
  name: string
  description: string | null
  worldId: string | null
  ownerId: string
  timelineId: string | null
  currentWorldPosition: Prisma.Decimal | null
  currentWorldDateLabel: string | null
  status: CampaignRecord['status']
  createdAt: Date
  updatedAt: Date
}): CampaignRecord {
  return {
    ...campaign,
    currentWorldPosition: campaign.currentWorldPosition?.toString() ?? null,
  }
}

export class PrismaCampaignRepository implements CampaignRepository {
  constructor(
    private readonly rootClient: PrismaClient,
    private readonly client: CampaignDatabaseClient = rootClient,
  ) {}

  runInTransaction<T>(
    operation: (repository: CampaignRepository) => Promise<T>,
  ): Promise<T> {
    return this.rootClient.$transaction((transaction) =>
      operation(new PrismaCampaignRepository(this.rootClient, transaction)),
    )
  }

  findWorldById(worldId: string) {
    return this.client.world.findUnique({
      where: { id: worldId },
      select: { id: true, ownerId: true },
    })
  }

  findMembership(
    worldId: string,
    userId: string,
  ): Promise<WorldMembershipRecord | null> {
    return this.client.worldMembership.findUnique({
      where: { worldId_userId: { worldId, userId } },
    })
  }

  findMainTimelineByWorldId(
    worldId: string,
  ): Promise<CampaignTimelineReference | null> {
    return this.client.worldTimeline.findFirst({
      where: { worldId, name: MAIN_WORLD_TIMELINE_NAME },
      select: { id: true, worldId: true },
      orderBy: { id: 'asc' },
    })
  }

  async createCampaign(
    input: CreateCampaignRecordInput,
  ): Promise<CampaignRecord> {
    const campaign = await this.client.campaign.create({
      data: {
        ...input,
        status: 'ACTIVE',
      },
    })

    return toCampaignRecord(campaign)
  }

  async createCampaignMembership(
    input: CreateCampaignMembershipInput,
  ): Promise<CampaignMembershipRecord> {
    try {
      return await this.client.campaignMembership.create({ data: input })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new CampaignMembershipRepositoryConflictError()
      }
      throw error
    }
  }

  async findCampaignForUser(
    campaignId: string,
    userId: string,
  ): Promise<CampaignRecord | null> {
    const campaign = await this.client.campaign.findFirst({
      where: {
        id: campaignId,
        OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
      },
    })

    return campaign ? toCampaignRecord(campaign) : null
  }

  async listCampaignsForUser(userId: string): Promise<CampaignRecord[]> {
    const campaigns = await this.client.campaign.findMany({
      where: {
        OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    })

    return campaigns.map(toCampaignRecord)
  }

  async updateOwnedCampaign(
    campaignId: string,
    ownerId: string,
    input: UpdateCampaignRecordInput,
  ): Promise<CampaignRecord | null> {
    const result = await this.client.campaign.updateMany({
      where: {
        id: campaignId,
        ownerId,
        status: { not: 'ARCHIVED' },
      },
      data: input,
    })

    if (result.count !== 1) return null

    const campaign = await this.client.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    })

    return toCampaignRecord(campaign)
  }

  async findCampaignManagementAccess(
    campaignId: string,
    userId: string,
  ): Promise<CampaignManagementAccess | null> {
    const campaign = await this.client.campaign.findFirst({
      where: {
        id: campaignId,
        OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
      },
      select: {
        ownerId: true,
        status: true,
        memberships: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    })

    if (!campaign) return null

    return {
      ownerId: campaign.ownerId,
      status: campaign.status,
      role: campaign.memberships[0]?.role ?? null,
    }
  }

  async updateManagedCampaign(
    campaignId: string,
    userId: string,
    input: UpdateCampaignRecordInput,
  ): Promise<CampaignRecord | null> {
    const result = await this.client.campaign.updateMany({
      where: {
        id: campaignId,
        status: { not: 'ARCHIVED' },
        OR: [
          { ownerId: userId },
          {
            memberships: {
              some: {
                userId,
                role: { in: ['GM', 'ASSISTANT_GM'] },
              },
            },
          },
        ],
      },
      data: input,
    })
    if (result.count !== 1) return null

    const campaign = await this.client.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    })
    return toCampaignRecord(campaign)
  }

  findCampaignById(campaignId: string) {
    return this.client.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, ownerId: true },
    })
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.client.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    return user !== null
  }

  findCampaignMembership(campaignId: string, userId: string) {
    return this.client.campaignMembership.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    })
  }

  async updateCampaignMembershipRole(
    campaignId: string,
    userId: string,
    role: CampaignMembershipRecord['role'],
  ) {
    try {
      return await this.client.campaignMembership.update({
        where: { campaignId_userId: { campaignId, userId } },
        data: {
          role,
          ...(role === 'PLAYER' ? {} : { capabilities: [] }),
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        return null
      throw error
    }
  }

  async updateCampaignMembershipCapabilities(
    campaignId: string,
    userId: string,
    capabilities: CampaignCapability[],
  ) {
    try {
      return await this.client.campaignMembership.update({
        where: { campaignId_userId: { campaignId, userId } },
        data: { capabilities },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null
      }
      throw error
    }
  }

  async hasActiveCampaignCharacterForUser(
    campaignId: string,
    userId: string,
  ): Promise<boolean> {
    const campaignCharacter = await this.client.campaignCharacter.findFirst({
      where: {
        campaignId,
        status: 'ACTIVE',
        worldCharacter: {
          character: { ownerUserId: userId },
        },
      },
      select: { id: true },
    })
    return campaignCharacter !== null
  }

  async deleteCampaignMembership(campaignId: string, userId: string) {
    const result = await this.client.campaignMembership.deleteMany({
      where: { campaignId, userId },
    })
    return result.count === 1
  }
}
