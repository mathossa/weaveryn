import { randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma'
import {
  WORLD_PERMISSIONS,
  WorldAuthorizationService,
} from '../worlds/world-permissions'
import {
  campaignArchivedReadOnly,
  campaignDeleteForbidden,
  campaignInvalidStatusTransition,
  campaignLifecycleForbidden,
  campaignMainTimelineNotFound,
  campaignNotFound,
  campaignOwnershipTransferForbidden,
  campaignSameOwner,
  campaignStateChanged,
  campaignUpdateForbidden,
  userNotFound,
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

export interface CampaignOwnerOperationInput {
  campaignId: string
  worldId: string | null
  actorUserId: string
}

export interface TransferCampaignOwnershipInput extends CampaignOwnerOperationInput {
  targetUserId: string
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

  transferOwnership(
    input: TransferCampaignOwnershipInput,
  ): Promise<CampaignRecord> {
    return this.repository.runInTransaction(async (repository) => {
      const campaign = await this.findScopedCampaign(repository, input)
      if (campaign.ownerId !== input.actorUserId) {
        throw campaignOwnershipTransferForbidden(
          input.campaignId,
          input.actorUserId,
        )
      }
      if (campaign.status === 'ARCHIVED') {
        throw campaignArchivedReadOnly(input.campaignId)
      }
      if (campaign.ownerId === input.targetUserId) {
        throw campaignSameOwner(input.campaignId)
      }
      if (!(await repository.userExists(input.targetUserId))) {
        throw userNotFound(input.targetUserId)
      }

      await repository.upsertCampaignGmMembership(
        input.campaignId,
        input.targetUserId,
      )
      const updated = await repository.updateCampaignOwner(
        input.campaignId,
        campaign.worldId,
        input.actorUserId,
        input.targetUserId,
      )
      if (!updated) throw campaignStateChanged(input.campaignId)
      return updated
    })
  }

  endCampaign(input: CampaignOwnerOperationInput): Promise<CampaignRecord> {
    return this.transitionCampaign(input, 'ACTIVE', 'ENDED')
  }

  archiveCampaign(input: CampaignOwnerOperationInput): Promise<CampaignRecord> {
    return this.transitionCampaign(input, 'ENDED', 'ARCHIVED')
  }

  deleteCampaign(input: CampaignOwnerOperationInput): Promise<void> {
    return this.repository.runInTransaction(async (repository) => {
      const campaign = await this.findScopedCampaign(repository, input)
      if (campaign.ownerId !== input.actorUserId) {
        throw campaignDeleteForbidden(input.campaignId, input.actorUserId)
      }
      if (
        !(await repository.deleteOwnedCampaign(
          input.campaignId,
          campaign.worldId,
          input.actorUserId,
        ))
      ) {
        throw campaignStateChanged(input.campaignId)
      }
    })
  }

  private transitionCampaign(
    input: CampaignOwnerOperationInput,
    currentStatus: CampaignRecord['status'],
    newStatus: CampaignRecord['status'],
  ): Promise<CampaignRecord> {
    return this.repository.runInTransaction(async (repository) => {
      const campaign = await this.findScopedCampaign(repository, input)
      if (campaign.ownerId !== input.actorUserId) {
        throw campaignLifecycleForbidden(input.campaignId, input.actorUserId)
      }
      if (campaign.status !== currentStatus) {
        throw campaignInvalidStatusTransition(
          input.campaignId,
          campaign.status,
          newStatus,
        )
      }

      const updated = await repository.updateCampaignStatus(
        input.campaignId,
        campaign.worldId,
        input.actorUserId,
        currentStatus,
        newStatus,
      )
      if (!updated) throw campaignStateChanged(input.campaignId)
      return updated
    })
  }

  private async findScopedCampaign(
    repository: CampaignRepository,
    input: Pick<CampaignOwnerOperationInput, 'campaignId' | 'worldId'>,
  ) {
    const campaign = await repository.findCampaignById(input.campaignId)
    if (!campaign || campaign.worldId !== input.worldId) {
      throw campaignNotFound(input.campaignId)
    }
    return campaign
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
        userId,
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
