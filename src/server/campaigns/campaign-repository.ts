import type { WorldAuthorizationRepository } from '../worlds/world-permissions'
import type {
  CampaignMembershipRecord,
  CampaignMembershipCampaignReference,
  CreateCampaignMembershipInput,
} from './campaign-membership-repository'
import type { ArchivedWorldSnapshot } from './campaign-archive'

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
  archivedWorldSnapshot: ArchivedWorldSnapshot | null
  status: CampaignStatus
  createdAt: Date
  updatedAt: Date
}

export interface CampaignTimelineReference {
  id: string
  worldId: string
}

export interface CampaignManagementAccess {
  ownerId: string
  status: CampaignStatus
  role: CampaignMembershipRecord['role'] | null
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
  createCampaignMembership(
    input: CreateCampaignMembershipInput,
  ): Promise<CampaignMembershipRecord>
  findCampaignById(
    campaignId: string,
  ): Promise<CampaignMembershipCampaignReference | null>
  userExists(userId: string): Promise<boolean>
  findCampaignMembership(
    campaignId: string,
    userId: string,
  ): Promise<CampaignMembershipRecord | null>
  upsertCampaignGmMembership(
    campaignId: string,
    userId: string,
  ): Promise<CampaignMembershipRecord>
  updateCampaignOwner(
    campaignId: string,
    worldId: string | null,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<CampaignRecord | null>
  updateCampaignStatus(
    campaignId: string,
    worldId: string | null,
    ownerId: string,
    currentStatus: CampaignStatus,
    newStatus: CampaignStatus,
  ): Promise<CampaignRecord | null>
  deleteOwnedCampaign(
    campaignId: string,
    worldId: string | null,
    ownerId: string,
  ): Promise<boolean>
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
  findCampaignManagementAccess(
    campaignId: string,
    userId: string,
  ): Promise<CampaignManagementAccess | null>
  updateManagedCampaign(
    campaignId: string,
    userId: string,
    input: UpdateCampaignRecordInput,
  ): Promise<CampaignRecord | null>
}
