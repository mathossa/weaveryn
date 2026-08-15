import type { CampaignRole } from './campaign-role'

export interface CampaignMembershipRecord {
  id: string
  campaignId: string
  userId: string
  role: CampaignRole
  joinedAt: Date
  updatedAt: Date
}

export interface CampaignMembershipCampaignReference {
  id: string
  ownerId: string
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
  deleteCampaignMembership(campaignId: string, userId: string): Promise<boolean>
}

export class CampaignMembershipRepositoryConflictError extends Error {
  constructor() {
    super('A Campaign membership already exists for this user.')
    this.name = 'CampaignMembershipRepositoryConflictError'
  }
}
