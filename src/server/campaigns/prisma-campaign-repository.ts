import type { Prisma, PrismaClient } from '../../generated/prisma/client'
import { MAIN_WORLD_TIMELINE_NAME } from '../worlds/world-timelines'
import type { WorldMembershipRecord } from '../worlds/world-membership-repository'
import type {
  CampaignRecord,
  CampaignRepository,
  CampaignTimelineReference,
  CreateCampaignRecordInput,
  UpdateCampaignRecordInput,
} from './campaign-repository'

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

  async findCampaignForUser(
    campaignId: string,
    userId: string,
  ): Promise<CampaignRecord | null> {
    const campaign = await this.client.campaign.findFirst({
      where: { id: campaignId, ownerId: userId },
    })

    return campaign ? toCampaignRecord(campaign) : null
  }

  async listCampaignsForUser(userId: string): Promise<CampaignRecord[]> {
    const campaigns = await this.client.campaign.findMany({
      where: { ownerId: userId },
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

    if (result.count !== 1) {
      return null
    }

    const campaign = await this.client.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    })

    return toCampaignRecord(campaign)
  }
}
