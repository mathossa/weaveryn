import { prisma } from '../../lib/prisma'
import {
  invalidFormerOwnerRole,
  newWorldOwnerNotFound,
  notWorldOwner,
  sameWorldOwner,
  worldNotFound,
} from './world-errors'
import { isWorldRole, type WorldRole } from './world-role'

export interface TransferWorldOwnershipInput {
  worldId: string
  currentOwnerId: string
  newOwnerId: string
  formerOwnerMembershipRole: WorldRole | null
}

export type WorldOwnershipServiceDatabase = Pick<typeof prisma, '$transaction'>

/**
 * Transfers a World to a new owner. A null formerOwnerMembershipRole means
 * that the former owner leaves the World after the transfer.
 */
export function createWorldOwnershipService(
  database: WorldOwnershipServiceDatabase = prisma,
) {
  return {
    async transferWorldOwnership({
      worldId,
      currentOwnerId,
      newOwnerId,
      formerOwnerMembershipRole,
    }: TransferWorldOwnershipInput) {
      if (
        formerOwnerMembershipRole !== null &&
        !isWorldRole(formerOwnerMembershipRole)
      ) {
        throw invalidFormerOwnerRole()
      }

      return database.$transaction(async (tx) => {
        const world = await tx.world.findUnique({
          where: { id: worldId },
          select: { ownerId: true },
        })

        if (!world) {
          throw worldNotFound(worldId, 'World not found')
        }

        if (world.ownerId !== currentOwnerId) {
          throw notWorldOwner(
            'Only the current World owner may transfer ownership',
          )
        }

        if (newOwnerId === currentOwnerId) {
          throw sameWorldOwner()
        }

        const newOwner = await tx.user.findUnique({
          where: { id: newOwnerId },
          select: { id: true },
        })

        if (!newOwner) {
          throw newWorldOwnerNotFound()
        }

        await tx.worldMembership.deleteMany({
          where: {
            worldId,
            userId: newOwnerId,
          },
        })

        const ownershipUpdate = await tx.world.updateMany({
          where: {
            id: worldId,
            ownerId: currentOwnerId,
          },
          data: { ownerId: newOwnerId },
        })

        if (ownershipUpdate.count !== 1) {
          throw notWorldOwner(
            'World ownership changed before the transfer could complete',
          )
        }

        if (formerOwnerMembershipRole === null) {
          await tx.worldMembership.deleteMany({
            where: {
              worldId,
              userId: currentOwnerId,
            },
          })
        } else {
          await tx.worldMembership.upsert({
            where: {
              worldId_userId: {
                worldId,
                userId: currentOwnerId,
              },
            },
            create: {
              worldId,
              userId: currentOwnerId,
              role: formerOwnerMembershipRole,
            },
            update: { role: formerOwnerMembershipRole },
          })
        }

        return tx.world.findUniqueOrThrow({
          where: { id: worldId },
        })
      })
    },
  }
}

export const { transferWorldOwnership } = createWorldOwnershipService()
