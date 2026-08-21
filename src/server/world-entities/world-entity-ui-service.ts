import { prisma } from '@/lib/prisma'
import { getWorldOverview } from '@/server/worlds'
import {
  WORLD_PERMISSIONS,
  WorldAuthorizationService,
} from '@/server/worlds/world-permissions'
import {
  filterEntityRelationshipsForCampaignContext,
  filterWorldEntitiesForCampaignContext,
} from './world-entity-campaign-context'
import {
  worldEntityTypeInUse,
  worldEntityTypeNotFound,
} from './world-entity-errors'
import { PrismaWorldEntityRepository } from './prisma-world-entity-repository'
import type { VisibilityScope } from './world-entity-repository'
import { worldEntityService } from './world-entity-service'

export type SimpleEntityFieldValue = string | number | boolean

type WorldOverview = NonNullable<Awaited<ReturnType<typeof getWorldOverview>>>
type WorldEntityRecord = Awaited<
  ReturnType<typeof worldEntityService.listEntities>
>[number]

export interface WorldEntityUiRecord {
  id: string
  type: string
  name: string
  description: string | null
  image: string | null
  imageFocusX: number
  imageFocusY: number
  data: Record<string, SimpleEntityFieldValue>
  worldCharacterId: string | null
  worldCharacterOwnedByCurrentUser: boolean
  visibilityScope: VisibilityScope
  visibilityCampaignId: string | null
  visibilityUserId: string | null
  createdById: string | null
  updatedAt: string
}

export interface WorldEntityRelationshipUiRecord {
  id: string
  sourceEntityId: string
  sourceName: string
  targetEntityId: string
  targetName: string
  relationshipType: string
  label: string | null
  visibilityScope: VisibilityScope
  visibilityCampaignId: string | null
  visibilityUserId: string | null
}

export interface WorldEntityVisibilityUserChoice {
  id: string
  label: string
}

export interface WorldEntityBrowseWorkspace {
  world: {
    id: string
    name: string
    accessKind: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'CAMPAIGN_ONLY'
  }
  contextCampaign: { id: string; name: string } | null
  entities: WorldEntityUiRecord[]
  canEditContent: boolean
}

export interface WorldEntityWorkspace extends WorldEntityBrowseWorkspace {
  campaigns: { id: string; name: string }[]
  relationships: WorldEntityRelationshipUiRecord[]
  relationshipTypes: string[]
  entityTypes: Awaited<ReturnType<typeof worldEntityService.listEntityTypes>>
  visibilityUsers: WorldEntityVisibilityUserChoice[]
}

function simpleData(value: unknown): Record<string, SimpleEntityFieldValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, SimpleEntityFieldValue] => {
        const field = entry[1]
        return (
          typeof field === 'string' ||
          typeof field === 'number' ||
          typeof field === 'boolean'
        )
      },
    ),
  )
}

function canEditWorldContent(world: WorldOverview) {
  return (
    world.accessKind === 'OWNER' ||
    world.accessKind === 'ADMIN' ||
    world.accessKind === 'MEMBER'
  )
}

function contextCampaign(
  world: WorldOverview,
  contextCampaignId?: string,
): { id: string; name: string } | null {
  if (!contextCampaignId) return null
  const campaign = world.campaigns.find(
    (choice) => choice.id === contextCampaignId,
  )
  return campaign ? { id: campaign.id, name: campaign.name } : null
}

function uiEntity(
  entity: WorldEntityRecord,
  userId: string,
): WorldEntityUiRecord {
  return {
    id: entity.id,
    type: entity.type,
    name: entity.name,
    description: entity.description,
    image: entity.image,
    imageFocusX: entity.imageFocusX ?? 50,
    imageFocusY: entity.imageFocusY ?? 50,
    data: simpleData(entity.data),
    worldCharacterId: entity.worldCharacterId ?? null,
    worldCharacterOwnedByCurrentUser: Boolean(
      entity.worldCharacterId && entity.createdById === userId,
    ),
    visibilityScope: entity.visibilityScope,
    visibilityCampaignId: entity.visibilityCampaignId,
    visibilityUserId: entity.visibilityUserId,
    createdById: entity.createdById,
    updatedAt: entity.updatedAt.toISOString(),
  }
}

function userLabel(user: {
  username: string
  displayName: string | null
  email: string
}) {
  return user.displayName?.trim() || `@${user.username}`
}

function addVisibilityUser(
  choices: Map<string, WorldEntityVisibilityUserChoice>,
  user: {
    id: string
    username: string
    displayName: string | null
    email: string
  },
) {
  choices.set(user.id, { id: user.id, label: userLabel(user) })
}

export async function deleteWorldEntityType(
  worldId: string,
  userId: string,
  typeId: string,
) {
  const repository = new PrismaWorldEntityRepository(prisma)
  const authorization = new WorldAuthorizationService(repository)
  await authorization.assertPermission(
    userId,
    worldId,
    WORLD_PERMISSIONS.EDIT_CONTENT,
  )

  return prisma.$transaction(async (transaction) => {
    const type = await transaction.worldEntityType.findFirst({
      where: { id: typeId, worldId },
    })
    if (!type) throw worldEntityTypeNotFound(typeId)

    const usageCount = await transaction.worldEntity.count({
      where: {
        worldId,
        type: { equals: type.name, mode: 'insensitive' },
      },
    })
    if (usageCount > 0) {
      throw worldEntityTypeInUse(type.name, usageCount)
    }

    await transaction.worldEntityType.delete({ where: { id: type.id } })
  })
}

export async function getWorldEntityBrowseWorkspace(
  worldId: string,
  userId: string,
  contextCampaignId?: string,
): Promise<WorldEntityBrowseWorkspace | null> {
  const world = await getWorldOverview(worldId, userId)
  if (!world) return null

  const resolvedContextCampaign = contextCampaign(world, contextCampaignId)
  const authorizedEntities = await worldEntityService.listEntities(
    worldId,
    userId,
  )
  const entities = filterWorldEntitiesForCampaignContext(
    authorizedEntities,
    resolvedContextCampaign?.id,
  )

  return {
    world: { id: world.id, name: world.name, accessKind: world.accessKind },
    contextCampaign: resolvedContextCampaign,
    entities: entities.map((entity) => uiEntity(entity, userId)),
    canEditContent: canEditWorldContent(world),
  }
}

export async function getWorldEntityWorkspace(
  worldId: string,
  userId: string,
  contextCampaignId?: string,
): Promise<WorldEntityWorkspace | null> {
  const world = await getWorldOverview(worldId, userId)
  if (!world) return null

  const resolvedContextCampaign = contextCampaign(world, contextCampaignId)
  const {
    entities: authorizedEntities,
    relationships: authorizedRelationships,
    entityTypes,
  } = await worldEntityService.readWorkspace(
    worldId,
    userId,
    resolvedContextCampaign?.id,
  )
  const entities = filterWorldEntitiesForCampaignContext(
    authorizedEntities,
    resolvedContextCampaign?.id,
  )
  const relationships = filterEntityRelationshipsForCampaignContext(
    authorizedRelationships,
    entities,
    resolvedContextCampaign?.id,
  )

  const entityById = new Map(entities.map((entity) => [entity.id, entity]))
  const canEditContent = canEditWorldContent(world)

  const visibilityUsers = new Map<string, WorldEntityVisibilityUserChoice>()
  if (canEditContent) {
    const worldPeople = await prisma.world.findUnique({
      where: { id: worldId },
      select: {
        owner: {
          select: { id: true, username: true, displayName: true, email: true },
        },
        memberships: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    })
    if (worldPeople?.owner)
      addVisibilityUser(visibilityUsers, worldPeople.owner)
    for (const membership of worldPeople?.memberships ?? []) {
      addVisibilityUser(visibilityUsers, membership.user)
    }

    const accessibleCampaignIds = world.campaigns.map((campaign) => campaign.id)
    if (accessibleCampaignIds.length > 0) {
      const campaignPeople = await prisma.campaign.findMany({
        where: { id: { in: accessibleCampaignIds } },
        select: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
            },
          },
          memberships: {
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  email: true,
                },
              },
            },
          },
        },
      })
      for (const campaign of campaignPeople) {
        addVisibilityUser(visibilityUsers, campaign.owner)
        for (const membership of campaign.memberships) {
          addVisibilityUser(visibilityUsers, membership.user)
        }
      }
    }
  }

  const relationshipTypes = [
    ...new Set(
      relationships
        .map((relationship) => relationship.relationshipType.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b))

  return {
    world: { id: world.id, name: world.name, accessKind: world.accessKind },
    contextCampaign: resolvedContextCampaign,
    campaigns: world.campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
    })),
    entities: entities.map((entity) => uiEntity(entity, userId)),
    relationships: relationships.map((relationship) => ({
      id: relationship.id,
      sourceEntityId: relationship.sourceEntityId,
      sourceName:
        entityById.get(relationship.sourceEntityId)?.name ?? 'Unknown entity',
      targetEntityId: relationship.targetEntityId,
      targetName:
        entityById.get(relationship.targetEntityId)?.name ?? 'Unknown entity',
      relationshipType: relationship.relationshipType,
      label: relationship.label,
      visibilityScope: relationship.visibilityScope,
      visibilityCampaignId: relationship.visibilityCampaignId,
      visibilityUserId: relationship.visibilityUserId,
    })),
    relationshipTypes,
    entityTypes,
    visibilityUsers: [...visibilityUsers.values()].sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
    canEditContent,
  }
}
