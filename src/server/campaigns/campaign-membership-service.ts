import {
  campaignMembershipAlreadyExists,
  campaignMembershipForbidden,
  campaignMembershipHasActiveCharacter,
  campaignMembershipNotFound,
  campaignOwnerMustBeGm,
  campaignNotFound,
  userNotFound,
} from './campaign-errors'
import {
  CampaignMembershipRepositoryConflictError,
  type CampaignMembershipRecord,
  type CampaignMembershipRepository,
} from './campaign-membership-repository'
import { assertCampaignRole, type CampaignRole } from './campaign-role'
import { prisma } from '../../lib/prisma'
import { PrismaCampaignRepository } from './prisma-campaign-repository'

export interface AddCampaignMemberInput {
  actorUserId: string
  campaignId: string
  userId: string
  role: CampaignRole
}

export type ChangeCampaignMemberRoleInput = AddCampaignMemberInput

export interface RemoveCampaignMemberInput {
  actorUserId: string
  campaignId: string
  userId: string
}

export async function assertCampaignMembershipManager(
  repository: CampaignMembershipRepository,
  actorUserId: string,
  campaignId: string,
) {
  const campaign = await repository.findCampaignById(campaignId)
  if (!campaign) throw campaignNotFound(campaignId)
  if (campaign.ownerId !== actorUserId) {
    throw campaignMembershipForbidden(campaignId, actorUserId)
  }
  return campaign
}

export class CampaignMembershipService {
  constructor(private readonly repository: CampaignMembershipRepository) {}

  async addMember(
    input: AddCampaignMemberInput,
  ): Promise<CampaignMembershipRecord> {
    assertCampaignRole(input.role)
    const campaign = await assertCampaignMembershipManager(
      this.repository,
      input.actorUserId,
      input.campaignId,
    )

    if (campaign.ownerId === input.userId && input.role !== 'GM') {
      throw campaignOwnerMustBeGm(input.campaignId, input.userId)
    }
    if (!(await this.repository.userExists(input.userId))) {
      throw userNotFound(input.userId)
    }
    if (
      await this.repository.findCampaignMembership(
        input.campaignId,
        input.userId,
      )
    ) {
      throw campaignMembershipAlreadyExists(input.campaignId, input.userId)
    }

    try {
      return await this.repository.createCampaignMembership({
        campaignId: input.campaignId,
        userId: input.userId,
        role: input.role,
      })
    } catch (error) {
      if (error instanceof CampaignMembershipRepositoryConflictError) {
        throw campaignMembershipAlreadyExists(input.campaignId, input.userId)
      }
      throw error
    }
  }

  async changeMemberRole(
    input: ChangeCampaignMemberRoleInput,
  ): Promise<CampaignMembershipRecord> {
    assertCampaignRole(input.role)
    const campaign = await assertCampaignMembershipManager(
      this.repository,
      input.actorUserId,
      input.campaignId,
    )
    if (campaign.ownerId === input.userId && input.role !== 'GM') {
      throw campaignOwnerMustBeGm(input.campaignId, input.userId)
    }
    const membership = await this.repository.updateCampaignMembershipRole(
      input.campaignId,
      input.userId,
      input.role,
    )
    if (!membership)
      throw campaignMembershipNotFound(input.campaignId, input.userId)
    return membership
  }

  async removeMember(input: RemoveCampaignMemberInput): Promise<void> {
    const campaign = await assertCampaignMembershipManager(
      this.repository,
      input.actorUserId,
      input.campaignId,
    )
    if (campaign.ownerId === input.userId) {
      throw campaignOwnerMustBeGm(input.campaignId, input.userId)
    }
    if (
      await this.repository.hasActiveCampaignCharacterForUser(
        input.campaignId,
        input.userId,
      )
    ) {
      throw campaignMembershipHasActiveCharacter(
        input.campaignId,
        input.userId,
      )
    }
    if (
      !(await this.repository.deleteCampaignMembership(
        input.campaignId,
        input.userId,
      ))
    ) {
      throw campaignMembershipNotFound(input.campaignId, input.userId)
    }
  }
}

export const campaignMembershipService = new CampaignMembershipService(
  new PrismaCampaignRepository(prisma),
)
