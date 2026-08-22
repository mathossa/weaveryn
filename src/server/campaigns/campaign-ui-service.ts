import { prisma } from '../../lib/prisma'
import {
  campaignAccessibleToUserWhere,
  worldAccessibleToUserWhere,
} from '../access/prisma-access-predicates'

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
  canEditName: boolean
  canEditSharedInfo: boolean
  canManageMembers: boolean
  characters: CampaignOverviewCharacter[]
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
  const canCreateCampaign = world.ownerId === userId || worldRole === 'ADMIN'

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
      world: { select: { id: true, name: true } },
      owner: {
        select: { id: true, username: true, displayName: true },
      },
      memberships: {
        where: { userId },
        select: { role: true },
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
    canEditName: campaign.status !== 'ARCHIVED' && isOwner,
    canEditSharedInfo,
    canManageMembers: campaign.status !== 'ARCHIVED' && isOwner,
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
