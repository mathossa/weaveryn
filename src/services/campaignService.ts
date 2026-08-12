import { prisma } from '../lib/prisma'
import { CampaignRole } from '../generated/prisma/client'

export async function createCampaign(
  ownerId: string,
  name: string,
  description?: string
) {
  if (!name || name.trim() === '') {
    throw new Error('Campaign name is required')
  }

  const trimmedName = name.trim()

  return await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        name: trimmedName,
        description,
        ownerId,
      },
    })

    await tx.campaignMembership.create({
      data: {
        campaignId: campaign.id,
        userId: ownerId,
        role: CampaignRole.OWNER,
      },
    })

    return campaign
  })
}
