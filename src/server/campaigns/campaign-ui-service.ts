import { prisma } from '../../lib/prisma'

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
  name: string
}

export interface CampaignOverview {
  id: string
  name: string
  description: string | null
  world: { id: string; name: string }
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
      OR: [
        { ownerId: userId },
        { memberships: { some: { userId } } },
        {
          campaigns: {
            some: {
              OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
            },
          },
        },
      ],
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
        where: {
          OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
        },
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
  const canCreateCampaign =
    world.ownerId === userId || worldRole === 'ADMIN'

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
      OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
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
              nameOverride: true,
              character: { select: { name: true } },
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
      name:
        campaignCharacter.worldCharacter.nameOverride ??
        campaignCharacter.worldCharacter.character.name,
    })),
  }
}
