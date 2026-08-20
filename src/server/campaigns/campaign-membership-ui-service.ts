import { prisma } from '../../lib/prisma'
import type { CampaignRole } from './campaign-role'

export interface ManagedCampaignMembership {
  userId: string
  username: string
  displayName: string | null
  role: CampaignRole
  activeCharacterCount: number
}

export async function listCampaignMembershipsForManagement(
  campaignId: string,
  actorUserId: string,
): Promise<ManagedCampaignMembership[] | null> {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      ownerId: actorUserId,
      status: { not: 'ARCHIVED' },
    },
    select: {
      ownerId: true,
      memberships: {
        select: {
          userId: true,
          role: true,
          user: {
            select: { username: true, displayName: true },
          },
        },
        orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
      },
    },
  })

  if (!campaign) return null

  const activeCampaignCharacters = await prisma.campaignCharacter.findMany({
    where: { campaignId, status: 'ACTIVE' },
    select: {
      worldCharacter: {
        select: {
          character: { select: { ownerUserId: true } },
        },
      },
    },
  })
  const characterCountByUser = new Map<string, number>()
  for (const campaignCharacter of activeCampaignCharacters) {
    const userId = campaignCharacter.worldCharacter.character.ownerUserId
    characterCountByUser.set(
      userId,
      (characterCountByUser.get(userId) ?? 0) + 1,
    )
  }

  return campaign.memberships
    .filter((membership) => membership.userId !== campaign.ownerId)
    .map((membership) => ({
      userId: membership.userId,
      username: membership.user.username,
      displayName: membership.user.displayName,
      role: membership.role,
      activeCharacterCount: characterCountByUser.get(membership.userId) ?? 0,
    }))
}
