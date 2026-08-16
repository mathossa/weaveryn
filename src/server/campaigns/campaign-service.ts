import { randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma'
import {
  WORLD_PERMISSIONS,
  WorldAuthorizationService,
} from '../worlds/world-permissions'
import {
  campaignMainTimelineNotFound,
  campaignUpdateForbidden,
} from './campaign-errors'
import { PrismaCampaignRepository } from './prisma-campaign-repository'
import type {
  CampaignRecord,
  CampaignRepository,
  UpdateCampaignRecordInput,
} from './campaign-repository'

export interface CreateCampaignInput {
  creatorId: string
  worldId: string
  name: string
  description?: string | null
  currentWorldPosition: string
  currentWorldDateLabel: string
}

export interface UpdateCampaignInput {
  name?: string
  description?: string | null
  currentWorldPosition?: string
  currentWorldDateLabel?: string
}

export type CampaignIdFactory = () => string

function pickCampaignUpdates(
  input: UpdateCampaignInput,
): UpdateCampaignRecordInput {
  const updates: UpdateCampaignRecordInput = {}

  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.currentWorldPosition !== undefined) {
    updates.currentWorldPosition = input.currentWorldPosition
  }
  if (input.currentWorldDateLabel !== undefined) {
    updates.currentWorldDateLabel = input.currentWorldDateLabel
  }

  return updates
}

export class CampaignService {
  constructor(
    private readonly repository: CampaignRepository,
    private readonly createId: CampaignIdFactory = randomUUID,
  ) {}

  createCampaign(input: CreateCampaignInput): Promise<CampaignRecord> {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        input.creatorId,
        input.worldId,
        WORLD_PERMISSIONS.CREATE_CAMPAIGN,
      )

      const timeline = await repository.findMainTimelineByWorldId(input.worldId)

      if (!timeline) {
        throw campaignMainTimelineNotFound(input.worldId)
      }

      const campaign = await repository.createCampaign({
        id: this.createId(),
        name: input.name,
        description: input.description,
        worldId: input.worldId,
        ownerId: input.creatorId,
        timelineId: timeline.id,
        currentWorldPosition: input.currentWorldPosition,
        currentWorldDateLabel: input.currentWorldDateLabel,
      })

      await repository.createCampaignMembership({
        campaignId: campaign.id,
        userId: input.creatorId,
        role: 'GM',
      })

      return campaign
    })
  }

  loadCampaign(
    campaignId: string,
    userId: string,
  ): Promise<CampaignRecord | null> {
    return this.repository.findCampaignForUser(campaignId, userId)
  }

  listCampaigns(userId: string): Promise<CampaignRecord[]> {
    return this.repository.listCampaignsForUser(userId)
  }

  updateCampaign(
    campaignId: string,
    userId: string,
    input: UpdateCampaignInput,
  ): Promise<CampaignRecord> {
    return this.repository.runInTransaction(async (repository) => {
      const campaign = await repository.updateOwnedCampaign(
        campaignId,
        userId,
        pickCampaignUpdates(input),
      )

      if (!campaign) throw campaignUpdateForbidden()
      return campaign
    })
  }

  updateCampaignManagement(
    campaignId: string,
    userId: string,
    input: UpdateCampaignInput,
  ): Promise<CampaignRecord> {
    return this.repository.runInTransaction(async (repository) => {
      const access = await repository.findCampaignManagementAccess(
        campaignId,
        userId,
      )

      if (!access || access.status === 'ARCHIVED') {
        throw campaignUpdateForbidden()
      }

      const isOwner = access.ownerId === userId
      const canEditShared =
        isOwner || access.role === 'GM' || access.role === 'ASSISTANT_GM'

      if (!canEditShared || (input.name !== undefined && !isOwner)) {
        throw campaignUpdateForbidden()
      }

      const updates = pickCampaignUpdates(input)
      if (!isOwner) delete updates.name

      const campaign = await repository.updateManagedCampaign(
        campaignId,
        updates,
      )

      if (!campaign) throw campaignUpdateForbidden()
      return campaign
    })
  }
}

export const campaignService = new CampaignService(
  new PrismaCampaignRepository(prisma),
)
