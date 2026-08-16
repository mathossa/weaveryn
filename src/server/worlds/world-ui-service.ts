import { prisma } from '../../lib/prisma'

export type WorldAccessKind =
  'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'CAMPAIGN_ONLY'

export interface WorldNavigationChoice {
  id: string
  name: string
  accessKind: WorldAccessKind
  orphaned: boolean
  canWeave: boolean
}

export interface WorldOverviewCampaign {
  id: string
  name: string
  role: 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'
  isOwner: boolean
}

export interface WorldOverview {
  id: string
  name: string
  description: string | null
  accessKind: WorldAccessKind
  orphaned: boolean
  canEditBasicInfo: boolean
  canClaimOwnership: boolean
  hasFullWorldAccess: boolean
  campaigns: WorldOverviewCampaign[]
}

function worldAccessKind(input: {
  ownerId: string | null
  userId: string
  membershipRole: 'ADMIN' | 'MEMBER' | 'VIEWER' | null
}): WorldAccessKind {
  if (input.ownerId === input.userId) return 'OWNER'
  if (input.membershipRole) return input.membershipRole
  return 'CAMPAIGN_ONLY'
}

function campaignRole(input: {
  ownerId: string
  userId: string
  membershipRole: 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR' | null
}): WorldOverviewCampaign['role'] {
  if (input.ownerId === input.userId) return 'GM'
  return input.membershipRole ?? 'SPECTATOR'
}

export async function listWorldNavigationChoices(
  userId: string,
): Promise<WorldNavigationChoice[]> {
  const worlds = await prisma.world.findMany({
    where: {
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
          OR: [
            { ownerId: userId },
            {
              memberships: {
                some: {
                  userId,
                  role: { in: ['GM', 'ASSISTANT_GM'] },
                },
              },
            },
          ],
        },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
  })

  return worlds.map((world) => {
    const accessKind = worldAccessKind({
      ownerId: world.ownerId,
      userId,
      membershipRole: world.memberships[0]?.role ?? null,
    })

    return {
      id: world.id,
      name: world.name,
      accessKind,
      orphaned: world.ownerId === null,
      canWeave:
        accessKind === 'OWNER' ||
        accessKind === 'ADMIN' ||
        world.campaigns.length > 0,
    }
  })
}

export async function getWorldOverview(
  worldId: string,
  userId: string,
): Promise<WorldOverview | null> {
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
      description: true,
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
          memberships: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      },
      _count: {
        select: {
          memberships: { where: { role: 'ADMIN' } },
        },
      },
    },
  })

  if (!world) return null

  const membershipRole = world.memberships[0]?.role ?? null
  const accessKind = worldAccessKind({
    ownerId: world.ownerId,
    userId,
    membershipRole,
  })
  const hasFullWorldAccess = accessKind !== 'CAMPAIGN_ONLY'
  const canEditBasicInfo = accessKind === 'OWNER' || accessKind === 'ADMIN'
  const ownsActiveCampaign = await prisma.campaign.findFirst({
    where: { worldId, ownerId: userId, status: 'ACTIVE' },
    select: { id: true },
  })
  const canClaimOwnership =
    world.ownerId === null &&
    (membershipRole === 'ADMIN' ||
      (world._count.memberships === 0 &&
        (membershipRole === 'MEMBER' || Boolean(ownsActiveCampaign))))

  return {
    id: world.id,
    name: world.name,
    description: hasFullWorldAccess ? world.description : null,
    accessKind,
    orphaned: world.ownerId === null,
    canEditBasicInfo,
    canClaimOwnership,
    hasFullWorldAccess,
    campaigns: world.campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      role: campaignRole({
        ownerId: campaign.ownerId,
        userId,
        membershipRole: campaign.memberships[0]?.role ?? null,
      }),
      isOwner: campaign.ownerId === userId,
    })),
  }
}
