import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import type {
  CampaignCharacterData,
  CampaignCharacterRecord,
  CampaignCharacterRepository,
  UpdateCampaignCharacterRecordInput,
} from './campaign-character-repository'
import { CampaignCharacterRepositoryConflictError } from './campaign-character-repository'
import {
  campaignCharacterAlreadyExists,
  campaignCharacterCampaignNotFound,
  campaignCharacterCrossWorld,
  campaignCharacterNotFound,
  campaignCharacterPermissionDenied,
  campaignCharacterWorldCharacterNotFound,
} from './campaign-character-errors'
import { PrismaCampaignCharacterRepository } from './prisma-campaign-character-repository'

export interface CreateCampaignCharacterInput {
  actorUserId: string
  worldCharacterId: string
  campaignId: string
  sheetData?: CampaignCharacterData
  status?: string
}

export interface UpdateCampaignCharacterInput {
  sheetData?: CampaignCharacterData
  status?: string
}

export type CampaignCharacterIdFactory = () => string

const managementRoles = new Set(['GM', 'ASSISTANT_GM'])

function pickUpdates(
  input: UpdateCampaignCharacterInput,
): UpdateCampaignCharacterRecordInput {
  return {
    ...(input.sheetData !== undefined ? { sheetData: input.sheetData } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
  }
}

export class CampaignCharacterService {
  constructor(
    private readonly repository: CampaignCharacterRepository,
    private readonly createId: CampaignCharacterIdFactory = randomUUID,
  ) {}

  async createCampaignCharacter(input: CreateCampaignCharacterInput) {
    return this.repository.runInTransaction(async (repository) => {
      const campaign = await repository.findCampaignById(input.campaignId)
      if (!campaign) throw campaignCharacterCampaignNotFound(input.campaignId)

      const isManager = await this.isManager(
        repository,
        input.actorUserId,
        input.campaignId,
        campaign.ownerId,
      )
      const membership = isManager
        ? null
        : await repository.findCampaignMembership(
            input.campaignId,
            input.actorUserId,
          )

      if (!isManager && membership?.role !== 'PLAYER') {
        throw campaignCharacterPermissionDenied(
          input.campaignId,
          input.actorUserId,
        )
      }

      const worldCharacter = await repository.findWorldCharacterById(
        input.worldCharacterId,
      )
      if (!worldCharacter) {
        throw campaignCharacterWorldCharacterNotFound(input.worldCharacterId)
      }

      if (!isManager && worldCharacter.ownerUserId !== input.actorUserId) {
        throw campaignCharacterPermissionDenied(
          input.campaignId,
          input.actorUserId,
        )
      }

      if (campaign.worldId !== worldCharacter.worldId) {
        throw campaignCharacterCrossWorld(
          input.worldCharacterId,
          input.campaignId,
        )
      }

      try {
        return await repository.createCampaignCharacter({
          id: this.createId(),
          worldCharacterId: input.worldCharacterId,
          campaignId: input.campaignId,
          sheetData: input.sheetData ?? {},
          status: input.status,
        })
      } catch (error) {
        if (error instanceof CampaignCharacterRepositoryConflictError) {
          throw campaignCharacterAlreadyExists(
            input.worldCharacterId,
            input.campaignId,
          )
        }
        throw error
      }
    })
  }

  async loadCampaignCharacter(id: string, actorUserId: string) {
    const value = await this.repository.findCampaignCharacterWithOwner(id)
    if (!value) return null
    if (await this.canReadState(this.repository, actorUserId, value)) {
      return {
        id: value.id,
        worldCharacterId: value.worldCharacterId,
        campaignId: value.campaignId,
        sheetData: value.sheetData,
        status: value.status,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
      }
    }
    throw campaignCharacterPermissionDenied(value.campaignId, actorUserId)
  }

  async listCampaignCharacters(campaignId: string, actorUserId: string) {
    await this.assertManager(this.repository, actorUserId, campaignId)
    return this.repository.listCampaignCharacters(campaignId)
  }

  async updateCampaignCharacter(
    id: string,
    actorUserId: string,
    input: UpdateCampaignCharacterInput,
  ): Promise<CampaignCharacterRecord> {
    return this.repository.runInTransaction(async (repository) => {
      const value = await repository.findCampaignCharacterWithOwner(id)
      if (!value) throw campaignCharacterNotFound(id)
      if (!(await this.canUpdateState(repository, actorUserId, value))) {
        throw campaignCharacterPermissionDenied(value.campaignId, actorUserId)
      }
      const updated = await repository.updateCampaignCharacter(
        id,
        pickUpdates(input),
      )
      if (!updated) throw campaignCharacterNotFound(id)
      return updated
    })
  }

  async removeCampaignCharacter(
    id: string,
    actorUserId: string,
  ): Promise<void> {
    return this.repository.runInTransaction(async (repository) => {
      const value = await repository.findCampaignCharacterWithOwner(id)
      if (!value) throw campaignCharacterNotFound(id)
      if (
        !(await this.canRemoveParticipation(repository, actorUserId, value))
      ) {
        throw campaignCharacterPermissionDenied(value.campaignId, actorUserId)
      }
      if (!(await repository.deleteCampaignCharacter(id))) {
        throw campaignCharacterNotFound(id)
      }
    })
  }

  private async canReadState(
    repository: CampaignCharacterRepository,
    userId: string,
    value: CampaignCharacterRecord & { ownerUserId: string },
  ) {
    if (await this.isManager(repository, userId, value.campaignId)) return true
    if (value.ownerUserId !== userId) return false
    return (
      (await repository.findCampaignMembership(value.campaignId, userId)) !==
      null
    )
  }

  private async canUpdateState(
    repository: CampaignCharacterRepository,
    userId: string,
    value: CampaignCharacterRecord & { ownerUserId: string },
  ) {
    if (await this.isManager(repository, userId, value.campaignId)) return true
    if (value.ownerUserId !== userId) return false
    const membership = await repository.findCampaignMembership(
      value.campaignId,
      userId,
    )
    return membership?.role === 'PLAYER'
  }

  private async canRemoveParticipation(
    repository: CampaignCharacterRepository,
    userId: string,
    value: CampaignCharacterRecord & { ownerUserId: string },
  ) {
    if (await this.isManager(repository, userId, value.campaignId)) return true
    if (value.ownerUserId !== userId) return false
    return (
      (await repository.findCampaignMembership(value.campaignId, userId)) !==
      null
    )
  }

  private async assertManager(
    repository: CampaignCharacterRepository,
    userId: string,
    campaignId: string,
  ) {
    const campaign = await repository.findCampaignById(campaignId)
    if (!campaign) throw campaignCharacterCampaignNotFound(campaignId)
    if (
      !(await this.isManager(repository, userId, campaignId, campaign.ownerId))
    ) {
      throw campaignCharacterPermissionDenied(campaignId, userId)
    }
    return campaign
  }

  private async isManager(
    repository: CampaignCharacterRepository,
    userId: string,
    campaignId: string,
    ownerId?: string,
  ) {
    if (ownerId === userId) return true
    if (ownerId === undefined) {
      const campaign = await repository.findCampaignById(campaignId)
      if (!campaign) return false
      if (campaign.ownerId === userId) return true
    }
    const membership = await repository.findCampaignMembership(
      campaignId,
      userId,
    )
    return membership ? managementRoles.has(membership.role) : false
  }
}

export const campaignCharacterService = new CampaignCharacterService(
  new PrismaCampaignCharacterRepository(prisma),
)
