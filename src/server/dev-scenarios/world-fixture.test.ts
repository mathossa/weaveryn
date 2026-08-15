import type { Prisma } from '@/generated/prisma/client'
import { describe, expect, it, vi } from 'vitest'
import {
  cleanupWorldFixture,
  type WorldFixtureDefinition,
} from './world-fixture'

const fixture: WorldFixtureDefinition = {
  worldId: '34000000-0000-4000-8000-000000000001',
  worldMarker: 'dev:cleanup-test:v1',
  people: [
    {
      id: '34000000-0000-4000-8000-00000000000a',
      email: 'cleanup-a@weaveryn.local',
      username: 'cleanup-a',
      displayName: 'Cleanup A',
    },
    {
      id: '34000000-0000-4000-8000-00000000000b',
      email: 'cleanup-b@weaveryn.local',
      username: 'cleanup-b',
      displayName: 'Cleanup B',
    },
  ],
}

describe('scenario cleanup', () => {
  it('deletes only marked records and reports referenced users as retained', async () => {
    const transaction = {
      world: {
        findUnique: vi.fn().mockResolvedValue({
          id: fixture.worldId,
          description: fixture.worldMarker,
        }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findMany: vi.fn().mockResolvedValue(
          fixture.people.map(({ id, email, username }) => ({
            id,
            email,
            username,
          })),
        ),
        deleteMany: vi
          .fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 0 }),
        findUnique: vi.fn().mockResolvedValue({ id: fixture.people[1].id }),
      },
    } as unknown as Prisma.TransactionClient

    const report = await cleanupWorldFixture(transaction, fixture)

    expect(transaction.world.deleteMany).toHaveBeenCalledWith({
      where: {
        id: fixture.worldId,
        description: fixture.worldMarker,
      },
    })
    expect(transaction.user.deleteMany).toHaveBeenCalledTimes(2)
    expect(transaction.user.deleteMany).toHaveBeenNthCalledWith(1, {
      where: expect.objectContaining({
        id: fixture.people[0].id,
        ownedCampaigns: { none: {} },
      }),
    })
    expect(report.deleted).toContain(
      `World ${fixture.worldId} and its scenario-owned dependants`,
    )
    expect(report.deleted).toContain(`User ${fixture.people[0].id}`)
    expect(report.retained).toEqual([
      `User ${fixture.people[1].id} is referenced outside this scenario and was retained`,
    ])
  })
})
