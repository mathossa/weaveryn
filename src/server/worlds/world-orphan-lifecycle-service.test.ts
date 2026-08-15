import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'

const prismaMock = vi.hoisted(() => ({ $transaction: vi.fn() }))

vi.mock('../../lib/prisma', () => ({ prisma: prismaMock }))

import {
  claimOrphanedWorld,
  cleanupOrphanedWorld,
  relinquishWorldOwnership,
} from './world-orphan-lifecycle-service'

const WORLD_ID = '13000000-0000-4000-8000-000000000001'
const OWNER_ID = '13000000-0000-4000-8000-000000000002'
const CLAIMANT_ID = '13000000-0000-4000-8000-000000000003'

function createTransactionMock() {
  return {
    world: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    worldMembership: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    campaign: { findFirst: vi.fn(), count: vi.fn() },
  }
}

type TransactionMock = ReturnType<typeof createTransactionMock>
type TransactionCallback = (transaction: TransactionMock) => Promise<unknown>

describe('World orphan lifecycle service', () => {
  let transaction: TransactionMock

  beforeEach(() => {
    vi.clearAllMocks()
    transaction = createTransactionMock()
    transaction.world.findUnique.mockResolvedValue({ ownerId: null })
    transaction.world.findUniqueOrThrow.mockResolvedValue({
      id: WORLD_ID,
      ownerId: CLAIMANT_ID,
    })
    transaction.world.updateMany.mockResolvedValue({ count: 1 })
    transaction.world.deleteMany.mockResolvedValue({ count: 1 })
    transaction.worldMembership.findUnique.mockResolvedValue(null)
    transaction.worldMembership.findFirst.mockResolvedValue(null)
    transaction.worldMembership.deleteMany.mockResolvedValue({ count: 0 })
    transaction.campaign.findFirst.mockResolvedValue(null)
    transaction.campaign.count.mockResolvedValue(0)
    prismaMock.$transaction.mockImplementation(
      async (callback: TransactionCallback) => callback(transaction),
    )
  })

  it('relinquishes ownership without changing World content, memberships, or Campaign references', async () => {
    transaction.world.findUnique.mockResolvedValue({ ownerId: OWNER_ID })
    transaction.world.findUniqueOrThrow.mockResolvedValue({
      id: WORLD_ID,
      ownerId: null,
      name: 'Preserved World',
    })

    await expect(
      relinquishWorldOwnership({ worldId: WORLD_ID, ownerId: OWNER_ID }),
    ).resolves.toMatchObject({ id: WORLD_ID, ownerId: null })

    expect(transaction.world.updateMany).toHaveBeenCalledWith({
      where: { id: WORLD_ID, ownerId: OWNER_ID },
      data: { ownerId: null },
    })
    expect(transaction.worldMembership.deleteMany).not.toHaveBeenCalled()
    expect(transaction.campaign.findFirst).not.toHaveBeenCalled()
    expect(transaction.campaign.count).not.toHaveBeenCalled()
  })

  it('keeps owner deletion capable of orphaning a World through the persistence contract', async () => {
    const schema = await readFile(
      new URL('../../../prisma/schema.prisma', import.meta.url),
      'utf8',
    )

    expect(schema).toContain(
      '@relation("WorldOwner", fields: [ownerId], references: [id], onDelete: SetNull)',
    )
  })

  it('rejects relinquishment by a non-owner without writing', async () => {
    transaction.world.findUnique.mockResolvedValue({ ownerId: CLAIMANT_ID })

    await expect(
      relinquishWorldOwnership({ worldId: WORLD_ID, ownerId: OWNER_ID }),
    ).rejects.toMatchObject({ code: 'NOT_WORLD_OWNER' })
    expect(transaction.world.updateMany).not.toHaveBeenCalled()
  })

  it.each(['ADMIN', 'MEMBER'] as const)(
    'allows an orphan claim by a %s World member and removes that membership',
    async (role) => {
      transaction.worldMembership.findUnique.mockResolvedValue({ role })

      await expect(
        claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
      ).resolves.toMatchObject({ ownerId: CLAIMANT_ID })

      expect(transaction.world.updateMany).toHaveBeenCalledWith({
        where: { id: WORLD_ID, ownerId: null },
        data: { ownerId: CLAIMANT_ID },
      })
      expect(transaction.worldMembership.deleteMany).toHaveBeenCalledWith({
        where: { worldId: WORLD_ID, userId: CLAIMANT_ID },
      })
    },
  )

  it('allows an active Campaign owner to claim without a World membership', async () => {
    transaction.campaign.findFirst.mockResolvedValue({ id: 'active-campaign' })

    await expect(
      claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
    ).resolves.toMatchObject({ ownerId: CLAIMANT_ID })
  })

  it('rejects a VIEWER unless they also own an active Campaign', async () => {
    transaction.worldMembership.findUnique.mockResolvedValue({ role: 'VIEWER' })

    await expect(
      claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
    ).rejects.toMatchObject({ code: 'WORLD_OWNERSHIP_CLAIM_FORBIDDEN' })
    expect(transaction.world.updateMany).not.toHaveBeenCalled()

    transaction.campaign.findFirst.mockResolvedValue({ id: 'active-campaign' })
    await expect(
      claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
    ).resolves.toMatchObject({ ownerId: CLAIMANT_ID })
  })

  it('does not treat Campaign membership as claim eligibility', async () => {
    await expect(
      claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
    ).rejects.toMatchObject({ code: 'WORLD_OWNERSHIP_CLAIM_FORBIDDEN' })

    expect(transaction.campaign.findFirst).toHaveBeenCalledWith({
      where: { worldId: WORLD_ID, ownerId: CLAIMANT_ID, status: 'ACTIVE' },
      select: { id: true },
    })
  })

  it('rejects claiming a non-orphaned World', async () => {
    transaction.world.findUnique.mockResolvedValue({ ownerId: OWNER_ID })

    await expect(
      claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
    ).rejects.toMatchObject({ code: 'WORLD_NOT_ORPHANED' })
  })

  it('uses the guarded ownership update to reject a competing claim atomically', async () => {
    transaction.worldMembership.findUnique.mockResolvedValue({ role: 'ADMIN' })
    transaction.world.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
    ).rejects.toMatchObject({ code: 'ORPHANED_WORLD_CHANGED' })
    expect(transaction.worldMembership.deleteMany).not.toHaveBeenCalled()
  })

  it('rejects cleanup for active Campaigns and eligible successors', async () => {
    transaction.campaign.count.mockResolvedValueOnce(1)

    await expect(cleanupOrphanedWorld(WORLD_ID)).rejects.toMatchObject({
      code: 'ORPHANED_WORLD_CLEANUP_BLOCKED_BY_ACTIVE_CAMPAIGNS',
    })

    transaction.campaign.count.mockReset()
    transaction.campaign.count.mockResolvedValue(0)
    transaction.worldMembership.findFirst.mockResolvedValue({ id: 'successor' })
    await expect(cleanupOrphanedWorld(WORLD_ID)).rejects.toMatchObject({
      code: 'ORPHANED_WORLD_CLEANUP_BLOCKED_BY_SUCCESSOR',
    })
    expect(transaction.world.deleteMany).not.toHaveBeenCalled()
  })

  it('requires ended or archived Campaigns to be resolved before cleanup', async () => {
    transaction.campaign.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1)

    await expect(cleanupOrphanedWorld(WORLD_ID)).rejects.toMatchObject({
      code: 'ORPHANED_WORLD_CLEANUP_REQUIRES_CAMPAIGN_RESOLUTION',
    })
    expect(transaction.world.deleteMany).not.toHaveBeenCalled()
  })

  it('removes an orphan only with no active Campaigns, successors, or remaining references', async () => {
    await expect(cleanupOrphanedWorld(WORLD_ID)).resolves.toBeUndefined()
    expect(transaction.world.deleteMany).toHaveBeenCalledWith({
      where: { id: WORLD_ID, ownerId: null },
    })
  })
})
