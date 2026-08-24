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
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    campaign: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
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
    transaction.worldMembership.count.mockResolvedValue(0)
    transaction.worldMembership.deleteMany.mockResolvedValue({ count: 0 })
    transaction.campaign.findFirst.mockResolvedValue(null)
    transaction.campaign.findMany.mockResolvedValue([])
    transaction.campaign.count.mockResolvedValue(0)
    transaction.campaign.updateMany.mockResolvedValue({ count: 1 })
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

  it('allows an ADMIN to claim while an ADMIN successor exists', async () => {
    transaction.worldMembership.findUnique.mockResolvedValue({ role: 'ADMIN' })
    transaction.worldMembership.count.mockResolvedValue(1)

    await expect(
      claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
    ).resolves.toMatchObject({ ownerId: CLAIMANT_ID })

    expect(transaction.worldMembership.deleteMany).toHaveBeenCalledWith({
      where: { worldId: WORLD_ID, userId: CLAIMANT_ID },
    })
  })

  it('rejects a MEMBER while any ADMIN successor remains', async () => {
    transaction.worldMembership.findUnique.mockResolvedValue({ role: 'MEMBER' })
    transaction.worldMembership.count.mockResolvedValue(1)

    await expect(
      claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
    ).rejects.toMatchObject({ code: 'WORLD_OWNERSHIP_CLAIM_FORBIDDEN' })
    expect(transaction.world.updateMany).not.toHaveBeenCalled()
  })

  it('rejects an active Campaign owner while any ADMIN successor remains', async () => {
    transaction.worldMembership.count.mockResolvedValue(1)
    transaction.campaign.findFirst.mockResolvedValue({ id: 'active-campaign' })

    await expect(
      claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
    ).rejects.toMatchObject({ code: 'WORLD_OWNERSHIP_CLAIM_FORBIDDEN' })
    expect(transaction.world.updateMany).not.toHaveBeenCalled()
  })

  it('allows a MEMBER to claim when no ADMIN remains', async () => {
    transaction.worldMembership.findUnique.mockResolvedValue({ role: 'MEMBER' })

    await expect(
      claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
    ).resolves.toMatchObject({ ownerId: CLAIMANT_ID })
  })

  it('allows an active Campaign owner to claim when no ADMIN remains, even while a MEMBER exists', async () => {
    transaction.campaign.findFirst.mockResolvedValue({ id: 'active-campaign' })

    await expect(
      claimOrphanedWorld({ worldId: WORLD_ID, claimantId: CLAIMANT_ID }),
    ).resolves.toMatchObject({ ownerId: CLAIMANT_ID })
  })

  it('rejects a VIEWER unless they independently own an active Campaign and no ADMIN remains', async () => {
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
    transaction.worldMembership.count.mockResolvedValue(1)
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

  it('requires ended Campaigns to be explicitly archived or deleted by their owner', async () => {
    transaction.campaign.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1)

    await expect(cleanupOrphanedWorld(WORLD_ID)).rejects.toMatchObject({
      code: 'ORPHANED_WORLD_CLEANUP_BLOCKED_BY_ENDED_CAMPAIGNS',
    })
    expect(transaction.campaign.findMany).not.toHaveBeenCalled()
    expect(transaction.world.deleteMany).not.toHaveBeenCalled()
  })

  it('snapshots and detaches archived Campaigns before deleting the orphaned World', async () => {
    transaction.campaign.findMany.mockResolvedValue([
      {
        id: 'archived-campaign',
        currentWorldPosition: 142.5,
        currentWorldDateLabel: '14 Emberwane, 812',
        world: {
          id: WORLD_ID,
          name: 'Preserved World',
          description: 'A remembered place.',
        },
        timeline: { id: 'timeline-1', name: 'Main timeline' },
        currentLocation: { id: 'location-1', name: 'Highwatch' },
      },
    ])

    await expect(cleanupOrphanedWorld(WORLD_ID)).resolves.toBeUndefined()

    expect(transaction.campaign.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'archived-campaign',
        worldId: WORLD_ID,
        status: 'ARCHIVED',
      },
      data: {
        archivedWorldSnapshot: expect.objectContaining({
          version: 1,
          world: expect.objectContaining({ name: 'Preserved World' }),
          finalContext: expect.objectContaining({
            worldPosition: '142.5',
            worldDateLabel: '14 Emberwane, 812',
          }),
        }),
        worldId: null,
        timelineId: null,
        currentLocationId: null,
      },
    })
    expect(transaction.world.deleteMany).toHaveBeenCalled()
  })

  it('fails closed if a non-archived Campaign reference remains after detachment', async () => {
    transaction.campaign.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)

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
