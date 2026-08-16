import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MAIN_WORLD_TIMELINE_NAME,
  createWorldService,
  type UpdateWorldInput,
  type WorldServiceDatabase,
} from './world-service'
import { WorldDomainError } from './world-errors'

const ownerId = '00000000-0000-0000-0000-000000000001'
const memberId = '00000000-0000-0000-0000-000000000002'
const worldId = '00000000-0000-0000-0000-000000000010'

const world = {
  id: worldId,
  name: 'Aldorath',
  description: 'A persistent fantasy setting',
  ownerId,
  createdAt: new Date('2026-08-14T00:00:00.000Z'),
  updatedAt: new Date('2026-08-14T00:00:00.000Z'),
}

function createDatabaseMock() {
  const transaction = {
    world: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    worldTimeline: {
      create: vi.fn(),
    },
  }

  const database = {
    world: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    worldTimeline: {},
    $transaction: vi.fn(
      async (operation: (client: typeof transaction) => Promise<unknown>) =>
        operation(transaction),
    ),
  } as unknown as WorldServiceDatabase

  return { database, transaction }
}

describe('worldService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a World owned by its creator and its main timeline atomically', async () => {
    const { database, transaction } = createDatabaseMock()
    transaction.world.create.mockResolvedValue(world)
    transaction.worldTimeline.create.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000020',
      worldId,
      name: MAIN_WORLD_TIMELINE_NAME,
      createdAt: world.createdAt,
      updatedAt: world.updatedAt,
    })

    const service = createWorldService(database)
    const result = await service.createWorld({
      creatorId: ownerId,
      name: world.name,
      description: world.description,
    })

    expect(database.$transaction).toHaveBeenCalledOnce()
    expect(transaction.world.create).toHaveBeenCalledWith({
      data: {
        name: world.name,
        description: world.description,
        ownerId,
      },
    })
    expect(transaction.worldTimeline.create).toHaveBeenCalledWith({
      data: {
        worldId,
        name: MAIN_WORLD_TIMELINE_NAME,
      },
    })
    expect(transaction.world.create.mock.calls[0][0].data).not.toHaveProperty(
      'memberships',
    )
    expect(result).toBe(world)
  })

  it('loads a World through ownership, World membership, Campaign ownership, or Campaign membership', async () => {
    const { database } = createDatabaseMock()
    vi.mocked(database.world.findFirst).mockResolvedValue(world)

    const service = createWorldService(database)
    const result = await service.loadWorldById(worldId, memberId)

    expect(database.world.findFirst).toHaveBeenCalledWith({
      where: {
        id: worldId,
        OR: [
          { ownerId: memberId },
          { memberships: { some: { userId: memberId } } },
          {
            campaigns: {
              some: {
                OR: [
                  { ownerId: memberId },
                  { memberships: { some: { userId: memberId } } },
                ],
              },
            },
          },
        ],
      },
    })
    expect(result).toBe(world)
  })

  it('lists Worlds accessible through ownership, World membership, Campaign ownership, or Campaign membership', async () => {
    const { database } = createDatabaseMock()
    vi.mocked(database.world.findMany).mockResolvedValue([world])

    const service = createWorldService(database)
    const result = await service.listAccessibleWorlds(memberId)

    expect(database.world.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { ownerId: memberId },
          { memberships: { some: { userId: memberId } } },
          {
            campaigns: {
              some: {
                OR: [
                  { ownerId: memberId },
                  { memberships: { some: { userId: memberId } } },
                ],
              },
            },
          },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    })
    expect(result).toEqual([world])
  })

  it('allows an owner or ADMIN to update basic World information', async () => {
    const { database, transaction } = createDatabaseMock()
    transaction.world.updateMany.mockResolvedValue({ count: 1 })
    transaction.world.findUniqueOrThrow.mockResolvedValue({
      ...world,
      description: 'Updated',
    })

    const service = createWorldService(database)
    const result = await service.updateWorld(worldId, memberId, {
      description: 'Updated',
    })

    expect(transaction.world.updateMany).toHaveBeenCalledWith({
      where: {
        id: worldId,
        OR: [
          { ownerId: memberId },
          {
            memberships: {
              some: { userId: memberId, role: 'ADMIN' },
            },
          },
        ],
      },
      data: { description: 'Updated' },
    })
    expect(result.description).toBe('Updated')
  })

  it('only forwards basic World fields to persistence', async () => {
    const { database, transaction } = createDatabaseMock()
    transaction.world.updateMany.mockResolvedValue({ count: 1 })
    transaction.world.findUniqueOrThrow.mockResolvedValue(world)

    const service = createWorldService(database)
    await service.updateWorld(worldId, ownerId, {
      name: 'Updated name',
      ownerId: memberId,
    } as UpdateWorldInput & { ownerId: string })

    expect(transaction.world.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Updated name' },
      }),
    )
  })

  it('rejects an update when the user is not the owner or an ADMIN', async () => {
    const { database, transaction } = createDatabaseMock()
    transaction.world.updateMany.mockResolvedValue({ count: 0 })

    const service = createWorldService(database)

    await expect(
      service.updateWorld(worldId, memberId, { name: 'Forbidden update' }),
    ).rejects.toMatchObject({
      code: 'WORLD_UPDATE_FORBIDDEN',
    } satisfies Partial<WorldDomainError>)
    expect(transaction.world.findUniqueOrThrow).not.toHaveBeenCalled()
  })
})
