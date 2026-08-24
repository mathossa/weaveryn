import type { CampaignRole } from './campaign-role'
import type { CampaignCapability } from './campaign-capability'

export interface CampaignMembershipRecord {
  id: string
  campaignId: string
  userId: string
  role: CampaignRole
  capabilities: CampaignCapability[]
  joinedAt: Date
  updatedAt: Date
}

export interface CampaignMembershipCampaignReference {
  id: string
  worldId: string | null
  ownerId: string
  status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
}

export interface CreateCampaignMembershipInput {
  campaignId: string
  userId: string
  role: CampaignRole
}

export interface CampaignMembershipRepository {
  findCampaignById(
    campaignId: string,
  ): Promise<CampaignMembershipCampaignReference | null>
  userExists(userId: string): Promise<boolean>
  findCampaignMembership(
    campaignId: string,
    userId: string,
  ): Promise<CampaignMembershipRecord | null>
  createCampaignMembership(
    input: CreateCampaignMembershipInput,
  ): Promise<CampaignMembershipRecord>
  updateCampaignMembershipRole(
    campaignId: string,
    userId: string,
    role: CampaignRole,
  ): Promise<CampaignMembershipRecord | null>
  updateCampaignMembershipCapabilities(
    campaignId: string,
    userId: string,
    capabilities: CampaignCapability[],
  ): Promise<CampaignMembershipRecord | null>
  hasActiveCampaignCharacterForUser?(
    campaignId: string,
    userId: string,
  ): Promise<boolean>
  deleteCampaignMembership(campaignId: string, userId: string): Promise<boolean>
}

export class CampaignMembershipRepositoryConflictError extends Error {
  constructor() {
    super('A Campaign membership already exists for this user.')
    this.name = 'CampaignMembershipRepositoryConflictError'
  }
}
