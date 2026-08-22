import { prisma } from '../../lib/prisma'
import {
  campaignAccessibleToUserWhere,
  worldAccessibleToUserWhere,
} from '../access/prisma-access-predicates'
import { hasWorldPermission, WORLD_PERMISSIONS } from './world-permissions'

export type WorldAccessKind =
  'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'CAMPAIGN_ONLY'

export interface WorldNavigationChoice {
  id: string
  name: string
  accessKind: WorldAccessKind
  orphaned: boolean
  canWeave: boolean
  canThreadwatch: boolean
}

export interface WorldOverviewCampaign {
  id: string
  name: string
  role: 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'
  isOwner: boolean
  pinned: boolean
  lastUsedAt: Date | null
  updatedAt: Date
}

export interface WorldOverview {
  id: string
  name: string
  description: string | null
  accessKind: WorldAccessKind
  orphaned: boolean
  canEditBasicInfo: boolean
  canManageMembers: boolean
  canCreateCampaign: boolean
  canClaimOwnership: boolean
  hasFullWorldAccess: boolean
  memberCount: number
  entityCount: number | null
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

export function shouldCheckOwnedActiveCampaignForClaim(input: {
  ownerId: string | null
  membershipRole: 'ADMIN' | 'MEMBER' | 'VIEWER' | null
  adminMembershipCount: number
}) {
  return (
    input.ownerId === null &&
    input.membershipRole !== 'ADMIN' &&
    input.membershipRole !== 'MEMBER' &&
    input.adminMembershipCount === 0
  )
}

export async function listWorldNavigationChoices(
  userId: string,
): Promise<WorldNavigationChoice[]> {
  const worlds = await prisma.world.findMany({
    where: worldAccessibleToUserWhere(userId),
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
                  role: { in: ['GM', 'ASSISTANT_GM', 'SPECTATOR'] },
                },
              },
            },
          ],
        },
        select: {
          ownerId: true,
          memberships: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        },
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
    const campaignRoles = world.campaigns.map((campaign) =>
      campaign.ownerId === userId
        ? 'GM'
        : (campaign.memberships[0]?.role ?? null),
    )

    return {
      id: world.id,
      name: world.name,
      accessKind,
      orphaned: world.ownerId === null,
      canWeave:
        accessKind === 'OWNER' ||
        accessKind === 'ADMIN' ||
        campaignRoles.some((role) => role === 'GM' || role === 'ASSISTANT_GM'),
      canThreadwatch: campaignRoles.includes('SPECTATOR'),
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
      ...worldAccessibleToUserWhere(userId),
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
        where: campaignAccessibleToUserWhere(userId),
        select: {
          id: true,
          name: true,
          ownerId: true,
          updatedAt: true,
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
  const canManageMembers = accessKind === 'OWNER' || accessKind === 'ADMIN'
  const canCreateCampaign = hasWorldPermission(
    {
      worldId,
      ownerId: world.ownerId,
      userId,
      isOwner: accessKind === 'OWNER',
      role: membershipRole,
    },
    WORLD_PERMISSIONS.CREATE_CAMPAIGN,
  )
  const shouldCheckOwnedActiveCampaign = shouldCheckOwnedActiveCampaignForClaim(
    {
      ownerId: world.ownerId,
      membershipRole,
      adminMembershipCount: world._count.memberships,
    },
  )

  const [ownsActiveCampaign, preferences, membershipCount, entityCount] =
    await Promise.all([
      shouldCheckOwnedActiveCampaign
        ? prisma.campaign.findFirst({
            where: { worldId, ownerId: userId, status: 'ACTIVE' },
            select: { id: true },
          })
        : Promise.resolve(null),
      prisma.entryPreference.findMany({
        where: {
          userId,
          kind: 'WEAVER',
          worldId,
          campaignId: { not: null },
        },
        select: {
          entryKey: true,
          campaignId: true,
          pinned: true,
          lastUsedAt: true,
        },
      }),
      prisma.worldMembership.count({ where: { worldId } }),
      hasFullWorldAccess
        ? prisma.worldEntity.count({ where: { worldId } })
        : Promise.resolve(null),
    ])

  const canClaimOwnership =
    world.ownerId === null &&
    (membershipRole === 'ADMIN' ||
      (world._count.memberships === 0 &&
        (membershipRole === 'MEMBER' || Boolean(ownsActiveCampaign))))

  const specificPreferences = new Map(
    preferences
      .filter(
        (preference) =>
          preference.campaignId &&
          preference.entryKey.startsWith('weaver-campaign:'),
      )
      .map((preference) => [preference.campaignId as string, preference]),
  )
  const resumePreference = preferences.find(
    (preference) => preference.entryKey === 'weaver',
  )

  const campaigns = world.campaigns
    .map((campaign) => {
      const preference = specificPreferences.get(campaign.id)
      const resumeFallback =
        !preference && resumePreference?.campaignId === campaign.id
          ? resumePreference
          : null

      return {
        id: campaign.id,
        name: campaign.name,
        role: campaignRole({
          ownerId: campaign.ownerId,
          userId,
          membershipRole: campaign.memberships[0]?.role ?? null,
        }),
        isOwner: campaign.ownerId === userId,
        pinned: preference?.pinned ?? false,
        lastUsedAt:
          preference?.lastUsedAt ?? resumeFallback?.lastUsedAt ?? null,
        updatedAt: campaign.updatedAt,
      }
    })
    .sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1
      const leftRecent = left.lastUsedAt?.getTime() ?? 0
      const rightRecent = right.lastUsedAt?.getTime() ?? 0
      if (leftRecent !== rightRecent) return rightRecent - leftRecent
      const updatedDifference =
        right.updatedAt.getTime() - left.updatedAt.getTime()
      if (updatedDifference !== 0) return updatedDifference
      return left.id.localeCompare(right.id)
    })

  return {
    id: world.id,
    name: world.name,
    description: hasFullWorldAccess ? world.description : null,
    accessKind,
    orphaned: world.ownerId === null,
    canEditBasicInfo,
    canManageMembers,
    canCreateCampaign,
    canClaimOwnership,
    hasFullWorldAccess,
    memberCount: membershipCount + (world.ownerId ? 1 : 0),
    entityCount,
    campaigns,
  }
}
