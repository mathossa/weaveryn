import type { WorldAuthorizationRepository } from '../worlds/world-permissions'

export const CAMPAIGN_STATUSES = ['ACTIVE', 'ENDED', 'ARCHIVED'] as const

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export interface CampaignRecord {
  id: string
  name: string
  description: string | null
  worldId: string | null
  ownerId: string
  timelineId: string | null
  currentWorldPosition: string | null
  currentWorldDateLabel: string | null
  status: CampaignStatus
  createdAt: Date
  updatedAt: Date
}

export interface CampaignTimelineReference {
  id: string
  worldId: string
}

export interface CreateCampaignRecordInput {
  id: string
  name: string
  description?: string | null
  worldId: string
  ownerId: string
  timelineId: string
  currentWorldPosition: string
  currentWorldDateLabel: string
}

export interface UpdateCampaignRecordInput {
  name?: string
  description?: string | null
  currentWorldPosition?: string
  currentWorldDateLabel?: string
}

export interface CampaignRepository extends WorldAuthorizationRepository {
  runInTransaction<T>(
    operation: (repository: CampaignRepository) => Promise<T>,
  ): Promise<T>
  findMainTimelineByWorldId(
    worldId: string,
  ): Promise<CampaignTimelineReference | null>
  createCampaign(input: CreateCampaignRecordInput): Promise<CampaignRecord>
  findCampaignForUser(
    campaignId: string,
    userId: string,
  ): Promise<CampaignRecord | null>
  listCampaignsForUser(userId: string): Promise<CampaignRecord[]>
  updateOwnedCampaign(
    campaignId: string,
    ownerId: string,
    input: UpdateCampaignRecordInput,
  ): Promise<CampaignRecord | null>
}
