import { WorldRole } from '../generated/prisma/client'
import { prisma } from '../lib/prisma'

export type WorldOwnershipTransferErrorCode =
  | 'INVALID_FORMER_OWNER_ROLE'
  | 'NEW_OWNER_NOT_FOUND'
  | 'NOT_WORLD_OWNER'
  | 'SAME_OWNER'
  | 'WORLD_NOT_FOUND'

export class WorldOwnershipTransferError extends Error {
  constructor(
    readonly code: WorldOwnershipTransferErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'WorldOwnershipTransferError'
  }
}

export interface TransferWorldOwnershipInput {
  worldId: string
  currentOwnerId: string
  newOwnerId: string
  formerOwnerMembershipRole: WorldRole | null
}

export type WorldOwnershipServiceDatabase = Pick<typeof prisma, '$transaction'>

const worldMembershipRoles = new Set<WorldRole>(Object.values(WorldRole))

/**
 * Transfers a World to a new owner. A null formerOwnerMembershipRole means
 * that the former owner leaves the World after the transfer.
 */
export function createWorldOwnershipService(
  database: WorldOwnershipServiceDatabase = prisma
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
        !worldMembershipRoles.has(formerOwnerMembershipRole)
      ) {
        throw new WorldOwnershipTransferError(
          'INVALID_FORMER_OWNER_ROLE',
          'Former owner membership role must be ADMIN, MEMBER, VIEWER, or null'
        )
      }

      return database.$transaction(async (tx) => {
        const world = await tx.world.findUnique({
          where: { id: worldId },
          select: { ownerId: true },
        })

        if (!world) {
          throw new WorldOwnershipTransferError(
            'WORLD_NOT_FOUND',
            'World not found'
          )
        }

        if (world.ownerId !== currentOwnerId) {
          throw new WorldOwnershipTransferError(
            'NOT_WORLD_OWNER',
            'Only the current World owner may transfer ownership'
          )
        }

        if (newOwnerId === currentOwnerId) {
          throw new WorldOwnershipTransferError(
            'SAME_OWNER',
            'World ownership cannot be transferred to the current owner'
          )
        }

        const newOwner = await tx.user.findUnique({
          where: { id: newOwnerId },
          select: { id: true },
        })

        if (!newOwner) {
          throw new WorldOwnershipTransferError(
            'NEW_OWNER_NOT_FOUND',
            'New World owner not found'
          )
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
          throw new WorldOwnershipTransferError(
            'NOT_WORLD_OWNER',
            'World ownership changed before the transfer could complete'
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
