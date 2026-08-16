import { prisma } from '../../lib/prisma'
import {
  notWorldOwner,
  orphanedWorldChanged,
  orphanedWorldCleanupBlockedByActiveCampaigns,
  orphanedWorldCleanupBlockedBySuccessor,
  orphanedWorldCleanupRequiresCampaignResolution,
  worldNotFound,
  worldNotOrphaned,
  worldOwnershipClaimForbidden,
} from './world-errors'

export interface RelinquishWorldOwnershipInput {
  worldId: string
  ownerId: string
}

export interface ClaimOrphanedWorldInput {
  worldId: string
  claimantId: string
}

export type WorldOrphanLifecycleServiceDatabase = Pick<
  typeof prisma,
  '$transaction'
>

export type WorldOrphanLifecycleTransaction = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0]

async function orphanWorldForOwner(
  transaction: WorldOrphanLifecycleTransaction,
  worldId: string,
  ownerId: string,
) {
  const update = await transaction.world.updateMany({
    where: { id: worldId, ownerId },
    data: { ownerId: null },
  })

  if (update.count !== 1) throw orphanedWorldChanged(worldId)
  return { id: worldId }
}

export async function orphanOwnedWorldsForAccountDeletion(
  transaction: WorldOrphanLifecycleTransaction,
  ownerId: string,
) {
  const worlds = await transaction.world.findMany({
    where: { ownerId },
    select: { id: true },
    orderBy: { id: 'asc' },
  })

  for (const world of worlds) {
    await orphanWorldForOwner(transaction, world.id, ownerId)
  }

  return worlds
}

export function createWorldOrphanLifecycleService(
  database: WorldOrphanLifecycleServiceDatabase = prisma,
) {
  return {
    async relinquishWorldOwnership({
      worldId,
      ownerId,
    }: RelinquishWorldOwnershipInput) {
      return database.$transaction(async (transaction) => {
        const world = await transaction.world.findUnique({
          where: { id: worldId },
          select: { ownerId: true },
        })

        if (!world) throw worldNotFound(worldId, 'World not found')
        if (world.ownerId !== ownerId) {
          throw notWorldOwner(
            'Only the current World owner may relinquish ownership',
          )
        }

        await orphanWorldForOwner(transaction, worldId, ownerId)
        return transaction.world.findUniqueOrThrow({ where: { id: worldId } })
      })
    },

    async claimOrphanedWorld({ worldId, claimantId }: ClaimOrphanedWorldInput) {
      return database.$transaction(async (transaction) => {
        const world = await transaction.world.findUnique({
          where: { id: worldId },
          select: { ownerId: true },
        })

        if (!world) throw worldNotFound(worldId, 'World not found')
        if (world.ownerId !== null) throw worldNotOrphaned(worldId)

        const [membership, ownedActiveCampaign, adminCount] = await Promise.all(
          [
            transaction.worldMembership.findUnique({
              where: { worldId_userId: { worldId, userId: claimantId } },
              select: { role: true },
            }),
            transaction.campaign.findFirst({
              where: { worldId, ownerId: claimantId, status: 'ACTIVE' },
              select: { id: true },
            }),
            transaction.worldMembership.count({
              where: { worldId, role: 'ADMIN' },
            }),
          ],
        )

        const claimantIsAdmin = membership?.role === 'ADMIN'
        const claimantIsMember = membership?.role === 'MEMBER'

        if (adminCount > 0 && !claimantIsAdmin) {
          throw worldOwnershipClaimForbidden(worldId, claimantId)
        }

        if (!claimantIsAdmin && !claimantIsMember && !ownedActiveCampaign) {
          throw worldOwnershipClaimForbidden(worldId, claimantId)
        }

        const update = await transaction.world.updateMany({
          where: { id: worldId, ownerId: null },
          data: { ownerId: claimantId },
        })

        if (update.count !== 1) throw orphanedWorldChanged(worldId)

        await transaction.worldMembership.deleteMany({
          where: { worldId, userId: claimantId },
        })

        return transaction.world.findUniqueOrThrow({ where: { id: worldId } })
      })
    },

    async cleanupOrphanedWorld(worldId: string) {
      return database.$transaction(async (transaction) => {
        const world = await transaction.world.findUnique({
          where: { id: worldId },
          select: { ownerId: true },
        })

        if (!world) throw worldNotFound(worldId, 'World not found')
        if (world.ownerId !== null) throw worldNotOrphaned(worldId)

        const [activeCampaignCount, successor, campaignCount] =
          await Promise.all([
            transaction.campaign.count({
              where: { worldId, status: 'ACTIVE' },
            }),
            transaction.worldMembership.findFirst({
              where: { worldId, role: { in: ['ADMIN', 'MEMBER'] } },
              select: { id: true },
            }),
            transaction.campaign.count({ where: { worldId } }),
          ])

        if (activeCampaignCount > 0) {
          throw orphanedWorldCleanupBlockedByActiveCampaigns(worldId)
        }
        if (successor) throw orphanedWorldCleanupBlockedBySuccessor(worldId)
        if (campaignCount > 0) {
          throw orphanedWorldCleanupRequiresCampaignResolution(worldId)
        }

        const deletion = await transaction.world.deleteMany({
          where: { id: worldId, ownerId: null },
        })

        if (deletion.count !== 1) throw orphanedWorldChanged(worldId)
      })
    },
  }
}

export const {
  relinquishWorldOwnership,
  claimOrphanedWorld,
  cleanupOrphanedWorld,
} = createWorldOrphanLifecycleService()
