import { prisma } from '../../lib/prisma'
import {
  campaignAccessibleToUserWhere,
  worldAccessibleToUserWhere,
} from '../access/prisma-access-predicates'
import {
  filterEntityRelationshipsForCampaignContext,
  filterWorldEntitiesForCampaignContext,
} from '../world-entities/world-entity-campaign-context'
import { worldEntityService } from '../world-entities/world-entity-service'
import {
  hasWorldPermission,
  WORLD_PERMISSIONS,
} from '../worlds/world-permissions'

export interface CampaignChoice {
  id: string
  name: string
  role: 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'
  isOwner: boolean
  status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
}

export interface WorldCampaignSelection {
  world: { id: string; name: string }
  canCreateCampaign: boolean
  campaigns: CampaignChoice[]
}

export interface CampaignOverviewCharacter {
  id: string
  worldCharacterId: string
  name: string
  image: string | null
  owner: { id: string; username: string; displayName: string | null }
  ownedByCurrentUser: boolean
}

export interface CampaignOverview {
  id: string
  name: string
  description: string | null
  world: { id: string; name: string }
  owner: { id: string; username: string; displayName: string | null }
  role: 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'
  isOwner: boolean
  status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
  currentWorldPosition: string | null
  currentWorldDateLabel: string | null
  currentFocus: string | null
  updatedAt: string
  canEditName: boolean
  canEditSharedInfo: boolean
  canManageMembers: boolean
  canTransferOwnership: boolean
  canEnd: boolean
  canArchive: boolean
  canDelete: boolean
  canUpdateCurrentLocation: boolean
  memberCount: number
  characters: CampaignOverviewCharacter[]
}

export interface CampaignNowEntity {
  id: string
  type: string
  name: string
  description: string | null
  image: string | null
  imageFocusX: number
  imageFocusY: number
}

export interface CampaignAroundYouEntry extends CampaignNowEntity {
  relationship: string
}

export interface CampaignNowContext {
  campaign: CampaignOverview
  currentLocation: CampaignNowEntity | null
  aroundYou: CampaignAroundYouEntry[]
  locationChoices: Array<{ id: string; name: string }>
}

function resolvedRole(input: {
  ownerId: string
  userId: string
  membershipRole: CampaignChoice['role'] | null
}): CampaignChoice['role'] {
  if (input.ownerId === input.userId) return 'GM'
  return input.membershipRole ?? 'SPECTATOR'
}

export async function getWorldCampaignSelection(
  worldId: string,
  userId: string,
): Promise<WorldCampaignSelection | null> {
  const world = await prisma.world.findFirst({
    where: {
      id: worldId,
      ...worldAccessibleToUserWhere(userId),
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      memberships: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
      campaigns: {
        where: campaignAccessibleToUserWhere(userId),
        select: {
          id: true,
          name: true,
          ownerId: true,
          status: true,
          memberships: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      },
    },
  })

  if (!world) return null

  const worldRole = world.memberships[0]?.role ?? null
  const canCreateCampaign = hasWorldPermission(
    {
      worldId,
      ownerId: world.ownerId,
      userId,
      isOwner: world.ownerId === userId,
      role: worldRole,
    },
    WORLD_PERMISSIONS.CREATE_CAMPAIGN,
  )

  return {
    world: { id: world.id, name: world.name },
    canCreateCampaign,
    campaigns: world.campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      role: resolvedRole({
        ownerId: campaign.ownerId,
        userId,
        membershipRole: campaign.memberships[0]?.role ?? null,
      }),
      isOwner: campaign.ownerId === userId,
      status: campaign.status,
    })),
  }
}

export async function getCampaignOverview(
  worldId: string,
  campaignId: string,
  userId: string,
): Promise<CampaignOverview | null> {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      worldId,
      ...campaignAccessibleToUserWhere(userId),
    },
    select: {
      id: true,
      name: true,
      description: true,
      ownerId: true,
      status: true,
      currentWorldPosition: true,
      currentWorldDateLabel: true,
      currentFocus: true,
      updatedAt: true,
      world: { select: { id: true, name: true } },
      owner: {
        select: { id: true, username: true, displayName: true },
      },
      _count: { select: { memberships: true } },
      memberships: {
        where: { userId },
        select: { role: true, capabilities: true },
        take: 1,
      },
      campaignCharacters: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          worldCharacter: {
            select: {
              id: true,
              nameOverride: true,
              character: {
                select: {
                  name: true,
                  image: true,
                  ownerUserId: true,
                  owner: {
                    select: { id: true, username: true, displayName: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
    },
  })

  if (!campaign || !campaign.world) return null

  const isOwner = campaign.ownerId === userId
  const role = resolvedRole({
    ownerId: campaign.ownerId,
    userId,
    membershipRole: campaign.memberships[0]?.role ?? null,
  })
  const canEditSharedInfo =
    campaign.status !== 'ARCHIVED' &&
    (isOwner || role === 'GM' || role === 'ASSISTANT_GM')

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    world: campaign.world,
    owner: campaign.owner,
    role,
    isOwner,
    status: campaign.status,
    currentWorldPosition: campaign.currentWorldPosition?.toString() ?? null,
    currentWorldDateLabel: campaign.currentWorldDateLabel,
    currentFocus: campaign.currentFocus,
    updatedAt: campaign.updatedAt.toISOString(),
    canEditName: campaign.status !== 'ARCHIVED' && isOwner,
    canEditSharedInfo,
    canManageMembers: campaign.status !== 'ARCHIVED' && isOwner,
    canTransferOwnership: campaign.status !== 'ARCHIVED' && isOwner,
    canEnd: campaign.status === 'ACTIVE' && isOwner,
    canArchive: campaign.status === 'ENDED' && isOwner,
    canDelete: isOwner,
    canUpdateCurrentLocation:
      campaign.status !== 'ARCHIVED' &&
      (canEditSharedInfo ||
        (role === 'PLAYER' &&
          (campaign.memberships[0]?.capabilities ?? []).includes(
            'UPDATE_CURRENT_LOCATION',
          ))),
    memberCount: campaign._count.memberships,
    characters: campaign.campaignCharacters.map((campaignCharacter) => ({
      id: campaignCharacter.id,
      worldCharacterId: campaignCharacter.worldCharacter.id,
      name:
        campaignCharacter.worldCharacter.nameOverride ??
        campaignCharacter.worldCharacter.character.name,
      image: campaignCharacter.worldCharacter.character.image,
      owner: campaignCharacter.worldCharacter.character.owner,
      ownedByCurrentUser:
        campaignCharacter.worldCharacter.character.ownerUserId === userId,
    })),
  }
}

function normalizedEntityType(type: string) {
  return type.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

function nowEntity(entity: {
  id: string
  type: string
  name: string
  description: string | null
  image: string | null
  imageFocusX?: number
  imageFocusY?: number
}): CampaignNowEntity {
  return {
    id: entity.id,
    type: entity.type,
    name: entity.name,
    description: entity.description,
    image: entity.image,
    imageFocusX: entity.imageFocusX ?? 50,
    imageFocusY: entity.imageFocusY ?? 50,
  }
}

export async function getCampaignNowContext(
  worldId: string,
  campaignId: string,
  userId: string,
): Promise<CampaignNowContext | null> {
  const campaign = await getCampaignOverview(worldId, campaignId, userId)
  if (!campaign) return null

  const contextRecord = await prisma.campaign.findUnique({
    where: { id: campaignId, worldId },
    select: { currentLocationId: true },
  })
  const [authorizedEntities, authorizedRelationships] = await Promise.all([
    worldEntityService.listEntities(worldId, userId),
    worldEntityService.listRelationships(worldId, userId),
  ])
  const entities = filterWorldEntitiesForCampaignContext(
    authorizedEntities,
    campaignId,
  )
  const relationships = filterEntityRelationshipsForCampaignContext(
    authorizedRelationships,
    entities,
    campaignId,
  )
  const entityById = new Map(entities.map((entity) => [entity.id, entity]))
  const locationRecord = contextRecord?.currentLocationId
    ? entityById.get(contextRecord.currentLocationId)
    : null
  const currentLocation =
    locationRecord && normalizedEntityType(locationRecord.type) === 'location'
      ? locationRecord
      : null

  const seenAround = new Set<string>()
  const aroundYou: CampaignAroundYouEntry[] = []
  if (currentLocation) {
    for (const relationship of relationships) {
      const otherId =
        relationship.sourceEntityId === currentLocation.id
          ? relationship.targetEntityId
          : relationship.targetEntityId === currentLocation.id
            ? relationship.sourceEntityId
            : null
      if (!otherId || seenAround.has(otherId)) continue
      const related = entityById.get(otherId)
      if (!related) continue
      seenAround.add(otherId)
      aroundYou.push({
        ...nowEntity(related),
        relationship:
          relationship.label?.trim() || relationship.relationshipType,
      })
    }
  }

  return {
    campaign,
    currentLocation: currentLocation ? nowEntity(currentLocation) : null,
    aroundYou,
    locationChoices: campaign.canUpdateCurrentLocation
      ? entities
          .filter((entity) => normalizedEntityType(entity.type) === 'location')
          .map((entity) => ({ id: entity.id, name: entity.name }))
          .sort((left, right) => left.name.localeCompare(right.name))
      : [],
  }
}
