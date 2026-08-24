import { Prisma } from '@/generated/prisma/client'
import {
  createArchivedWorldSnapshot,
  type ArchivedWorldSnapshot,
} from './campaign-archive'
import { campaignStateChanged } from './campaign-errors'

export async function detachArchivedCampaignsForWorldDeletion(
  transaction: Prisma.TransactionClient,
  worldId: string,
): Promise<Array<{ id: string; snapshot: ArchivedWorldSnapshot }>> {
  const campaigns = await transaction.campaign.findMany({
    where: { worldId, status: 'ARCHIVED' },
    select: {
      id: true,
      currentWorldPosition: true,
      currentWorldDateLabel: true,
      world: {
        select: { id: true, name: true, description: true },
      },
      timeline: {
        select: { id: true, name: true },
      },
      currentLocation: {
        select: { id: true, name: true },
      },
    },
    orderBy: { id: 'asc' },
  })

  const detached: Array<{ id: string; snapshot: ArchivedWorldSnapshot }> = []
  for (const campaign of campaigns) {
    if (!campaign.world) throw campaignStateChanged(campaign.id)
    const snapshot = createArchivedWorldSnapshot({
      world: campaign.world,
      timeline: campaign.timeline,
      currentWorldPosition: campaign.currentWorldPosition?.toString() ?? null,
      currentWorldDateLabel: campaign.currentWorldDateLabel,
      currentLocation: campaign.currentLocation,
    })
    const update = await transaction.campaign.updateMany({
      where: { id: campaign.id, worldId, status: 'ARCHIVED' },
      data: {
        archivedWorldSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        worldId: null,
        timelineId: null,
        currentLocationId: null,
      },
    })
    if (update.count !== 1) throw campaignStateChanged(campaign.id)
    detached.push({ id: campaign.id, snapshot })
  }

  return detached
}
