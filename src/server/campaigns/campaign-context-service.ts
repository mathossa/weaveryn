import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import {
  worldEntityService,
  type WorldEntityRecord,
} from '@/server/world-entities'
import { filterWorldEntitiesForCampaignContext } from '@/server/world-entities/world-entity-campaign-context'
import {
  campaignLocationInvalid,
  campaignUpdateForbidden,
} from './campaign-errors'
import type { CampaignCapability } from './campaign-capability'
import type { CampaignContextUpdateInput } from './campaign-context-input'
import type { CampaignRole } from './campaign-role'

export interface CampaignContextAccess {
  id: string
  worldId: string | null
  ownerId: string
  status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
  role: CampaignRole | null
  capabilities: CampaignCapability[]
}

export interface CampaignContextRecord {
  id: string
  currentLocationId: string | null
  currentFocus: string | null
  updatedAt: Date
}

export interface CampaignContextRepository {
  findAccess(
    campaignId: string,
    userId: string,
  ): Promise<CampaignContextAccess | null>
  updateAuthorized(
    campaignId: string,
    worldId: string,
    userId: string,
    input: CampaignContextUpdateInput,
    requiresManager: boolean,
  ): Promise<CampaignContextRecord | null>
}

export interface CampaignContextEntityGateway {
  loadEntity(
    worldId: string,
    userId: string,
    entityId: string,
  ): Promise<WorldEntityRecord | null>
}

function isManager(access: CampaignContextAccess, userId: string) {
  return (
    access.ownerId === userId ||
    access.role === 'GM' ||
    access.role === 'ASSISTANT_GM'
  )
}

function isLocationType(type: string) {
  return (
    type.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US') === 'location'
  )
}

export class CampaignContextService {
  constructor(
    private readonly repository: CampaignContextRepository,
    private readonly entities: CampaignContextEntityGateway,
  ) {}

  async update(
    campaignId: string,
    userId: string,
    input: CampaignContextUpdateInput,
  ): Promise<CampaignContextRecord> {
    const access = await this.repository.findAccess(campaignId, userId)
    if (!access || !access.worldId || access.status === 'ARCHIVED') {
      throw campaignUpdateForbidden()
    }

    const manager = isManager(access, userId)
    const updatesFocus = input.currentFocus !== undefined
    const updatesLocation = input.currentLocationId !== undefined
    const canUpdateLocation =
      manager ||
      (access.role === 'PLAYER' &&
        access.capabilities.includes('UPDATE_CURRENT_LOCATION'))

    if ((updatesFocus && !manager) || (updatesLocation && !canUpdateLocation)) {
      throw campaignUpdateForbidden()
    }

    if (input.currentLocationId) {
      const location = await this.entities.loadEntity(
        access.worldId,
        userId,
        input.currentLocationId,
      )
      if (
        !location ||
        !isLocationType(location.type) ||
        filterWorldEntitiesForCampaignContext([location], campaignId).length ===
          0
      ) {
        throw campaignLocationInvalid()
      }
    }

    const updated = await this.repository.updateAuthorized(
      campaignId,
      access.worldId,
      userId,
      input,
      updatesFocus,
    )
    if (!updated) throw campaignUpdateForbidden()
    return updated
  }
}

export const prismaCampaignContextRepository: CampaignContextRepository = {
  async findAccess(campaignId, userId) {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
      },
      select: {
        id: true,
        worldId: true,
        ownerId: true,
        status: true,
        memberships: {
          where: { userId },
          select: { role: true, capabilities: true },
          take: 1,
        },
      },
    })
    if (!campaign) return null
    return {
      id: campaign.id,
      worldId: campaign.worldId,
      ownerId: campaign.ownerId,
      status: campaign.status,
      role: campaign.memberships[0]?.role ?? null,
      capabilities: campaign.memberships[0]?.capabilities ?? [],
    }
  },

  async updateAuthorized(campaignId, worldId, userId, input, requiresManager) {
    const managerAccess: Prisma.CampaignWhereInput[] = [
      { ownerId: userId },
      {
        memberships: {
          some: { userId, role: { in: ['GM', 'ASSISTANT_GM'] } },
        },
      },
    ]
    const updateAccess: Prisma.CampaignWhereInput[] = requiresManager
      ? managerAccess
      : [
          ...managerAccess,
          {
            memberships: {
              some: {
                userId,
                role: 'PLAYER' as const,
                capabilities: { has: 'UPDATE_CURRENT_LOCATION' as const },
              },
            },
          },
        ]
    const result = await prisma.campaign.updateMany({
      where: {
        id: campaignId,
        worldId,
        status: { not: 'ARCHIVED' },
        OR: updateAccess,
      },
      data: input,
    })
    if (result.count !== 1) return null
    return prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        currentLocationId: true,
        currentFocus: true,
        updatedAt: true,
      },
    })
  },
}

export const campaignContextService = new CampaignContextService(
  prismaCampaignContextRepository,
  worldEntityService,
)
