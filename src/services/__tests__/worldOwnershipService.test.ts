import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorldRole } from '../../generated/prisma/client'

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
}))

vi.mock('../../lib/prisma', () => ({
  prisma: prismaMock,
}))

import {
  transferWorldOwnership,
  WorldOwnershipTransferError,
} from '../worldOwnershipService'

const worldId = '10000000-0000-4000-8000-000000000001'
const currentOwnerId = '10000000-0000-4000-8000-000000000002'
const newOwnerId = '10000000-0000-4000-8000-000000000003'

function createTransactionMock() {
  return {
    world: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    worldMembership: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
  }
}

type TransactionMock = ReturnType<typeof createTransactionMock>
type TransactionCallback = (transaction: TransactionMock) => Promise<unknown>

function transfer(formerOwnerMembershipRole: WorldRole | null) {
  return transferWorldOwnership({
    worldId,
    currentOwnerId,
    newOwnerId,
    formerOwnerMembershipRole,
  })
}

describe('transferWorldOwnership', () => {
  let tx: TransactionMock

  beforeEach(() => {
    vi.clearAllMocks()
    tx = createTransactionMock()

    tx.world.findUnique.mockResolvedValue({ ownerId: currentOwnerId })
    tx.user.findUnique.mockResolvedValue({ id: newOwnerId })
    tx.worldMembership.deleteMany.mockResolvedValue({ count: 1 })
    tx.worldMembership.upsert.mockResolvedValue({})
    tx.world.updateMany.mockResolvedValue({ count: 1 })
    tx.world.findUniqueOrThrow.mockResolvedValue({
      id: worldId,
      ownerId: newOwnerId,
      name: 'Transferred World',
    })

    prismaMock.$transaction.mockImplementation(
      async (callback: TransactionCallback) => callback(tx)
    )
  })

  it.each([WorldRole.ADMIN, WorldRole.MEMBER, WorldRole.VIEWER])(
    'transfers ownership and makes the former owner a %s',
    async (role) => {
      const world = await transfer(role)

      expect(world).toMatchObject({ ownerId: newOwnerId })
      expect(tx.worldMembership.deleteMany).toHaveBeenCalledWith({
        where: { worldId, userId: newOwnerId },
      })
      expect(tx.world.updateMany).toHaveBeenCalledWith({
        where: { id: worldId, ownerId: currentOwnerId },
        data: { ownerId: newOwnerId },
      })
      expect(tx.worldMembership.upsert).toHaveBeenCalledWith({
        where: {
          worldId_userId: { worldId, userId: currentOwnerId },
        },
        create: {
          worldId,
          userId: currentOwnerId,
          role,
        },
        update: { role },
      })
    }
  )

  it('removes both memberships when the former owner leaves', async () => {
    await transfer(null)

    expect(tx.worldMembership.deleteMany).toHaveBeenNthCalledWith(1, {
      where: { worldId, userId: newOwnerId },
    })
    expect(tx.worldMembership.deleteMany).toHaveBeenNthCalledWith(2, {
      where: { worldId, userId: currentOwnerId },
    })
    expect(tx.worldMembership.upsert).not.toHaveBeenCalled()
  })

  it('rejects a transfer initiated by a non-owner without writing', async () => {
    tx.world.findUnique.mockResolvedValue({
      ownerId: '10000000-0000-4000-8000-000000000004',
    })

    await expect(transfer(WorldRole.ADMIN)).rejects.toMatchObject({
      code: 'NOT_WORLD_OWNER',
    })
    expect(tx.user.findUnique).not.toHaveBeenCalled()
    expect(tx.worldMembership.deleteMany).not.toHaveBeenCalled()
    expect(tx.world.updateMany).not.toHaveBeenCalled()
  })

  it('rejects a transfer when the World does not exist', async () => {
    tx.world.findUnique.mockResolvedValue(null)

    await expect(transfer(WorldRole.ADMIN)).rejects.toMatchObject({
      code: 'WORLD_NOT_FOUND',
    })
    expect(tx.world.updateMany).not.toHaveBeenCalled()
  })

  it('rejects transferring ownership to the current owner', async () => {
    await expect(
      transferWorldOwnership({
        worldId,
        currentOwnerId,
        newOwnerId: currentOwnerId,
        formerOwnerMembershipRole: null,
      })
    ).rejects.toMatchObject({ code: 'SAME_OWNER' })
    expect(tx.worldMembership.deleteMany).not.toHaveBeenCalled()
    expect(tx.world.updateMany).not.toHaveBeenCalled()
  })

  it('rejects a missing new owner without changing ownership', async () => {
    tx.user.findUnique.mockResolvedValue(null)

    await expect(transfer(WorldRole.MEMBER)).rejects.toMatchObject({
      code: 'NEW_OWNER_NOT_FOUND',
    })
    expect(tx.worldMembership.deleteMany).not.toHaveBeenCalled()
    expect(tx.world.updateMany).not.toHaveBeenCalled()
  })

  it('rejects an unsupported former-owner role before opening a transaction', async () => {
    await expect(
      transferWorldOwnership({
        worldId,
        currentOwnerId,
        newOwnerId,
        formerOwnerMembershipRole: 'OWNER' as WorldRole,
      })
    ).rejects.toBeInstanceOf(WorldOwnershipTransferError)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('rejects a concurrent ownership change', async () => {
    tx.world.updateMany.mockResolvedValue({ count: 0 })

    await expect(transfer(WorldRole.VIEWER)).rejects.toMatchObject({
      code: 'NOT_WORLD_OWNER',
    })
    expect(tx.worldMembership.upsert).not.toHaveBeenCalled()
  })

  it('rolls back every change when applying the former owner state fails', async () => {
    const committedState = {
      ownerId: currentOwnerId,
      memberIds: new Set([newOwnerId]),
    }

    prismaMock.$transaction.mockImplementation(
      async (callback: TransactionCallback) => {
        const workingState = {
          ownerId: committedState.ownerId,
          memberIds: new Set(committedState.memberIds),
        }
        const rollbackTx = createTransactionMock()

        rollbackTx.world.findUnique.mockResolvedValue({
          ownerId: workingState.ownerId,
        })
        rollbackTx.user.findUnique.mockResolvedValue({ id: newOwnerId })
        rollbackTx.worldMembership.deleteMany.mockImplementation(
          async ({ where }: { where: { userId: string } }) => {
            workingState.memberIds.delete(where.userId)
            return { count: 1 }
          }
        )
        rollbackTx.world.updateMany.mockImplementation(async () => {
          workingState.ownerId = newOwnerId
          return { count: 1 }
        })
        rollbackTx.worldMembership.upsert.mockRejectedValue(
          new Error('forced former owner membership failure')
        )

        const result = await callback(rollbackTx)

        committedState.ownerId = workingState.ownerId
        committedState.memberIds = workingState.memberIds
        return result
      }
    )

    await expect(transfer(WorldRole.ADMIN)).rejects.toThrow(
      'forced former owner membership failure'
    )
    expect(committedState.ownerId).toBe(currentOwnerId)
    expect(committedState.memberIds).toEqual(new Set([newOwnerId]))
  })
})
