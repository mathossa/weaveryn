import type { Prisma } from '@/generated/prisma/client'

export function campaignAccessibleToUserWhere(
  userId: string,
): Prisma.CampaignWhereInput {
  return {
    OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
  }
}

export function worldAccessibleToUserWhere(
  userId: string,
): Prisma.WorldWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { memberships: { some: { userId } } },
      { campaigns: { some: campaignAccessibleToUserWhere(userId) } },
    ],
  }
}
