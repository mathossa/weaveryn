import type { Prisma } from '@/generated/prisma/client'
import type { DevCleanupSummary } from '@/dev/scenario-contracts'
import {
  assertFixtureUsersOwned,
  assertFixtureWorldOwned,
  type FixtureUserIdentity,
} from './fixture-safety'

export interface WorldFixturePerson extends FixtureUserIdentity {
  displayName: string
}

export interface WorldFixtureDefinition {
  worldId: string
  worldMarker: string
  people: readonly WorldFixturePerson[]
}

export async function assertWorldFixtureOwned(
  transaction: Prisma.TransactionClient,
  fixture: WorldFixtureDefinition,
) {
  const [world, users] = await Promise.all([
    transaction.world.findUnique({
      where: { id: fixture.worldId },
      select: { id: true, description: true },
    }),
    transaction.user.findMany({
      where: {
        OR: [
          { id: { in: fixture.people.map((person) => person.id) } },
          { email: { in: fixture.people.map((person) => person.email) } },
          { username: { in: fixture.people.map((person) => person.username) } },
        ],
      },
      select: { id: true, email: true, username: true },
    }),
  ])

  assertFixtureWorldOwned(world, {
    id: fixture.worldId,
    marker: fixture.worldMarker,
  })
  assertFixtureUsersOwned(users, [...fixture.people])
}

export async function upsertFixturePeople(
  transaction: Prisma.TransactionClient,
  people: readonly WorldFixturePerson[],
) {
  for (const person of people) {
    await transaction.user.upsert({
      where: { id: person.id },
      create: {
        id: person.id,
        email: person.email,
        username: person.username,
        displayName: person.displayName,
      },
      update: {
        email: person.email,
        username: person.username,
        displayName: person.displayName,
      },
    })
  }
}

export async function cleanupWorldFixture(
  transaction: Prisma.TransactionClient,
  fixture: WorldFixtureDefinition,
): Promise<DevCleanupSummary> {
  await assertWorldFixtureOwned(transaction, fixture)

  const deleted: string[] = []
  const retained: string[] = []
  const worldDeletion = await transaction.world.deleteMany({
    where: {
      id: fixture.worldId,
      description: fixture.worldMarker,
    },
  })

  if (worldDeletion.count === 1) {
    deleted.push(`World ${fixture.worldId} and its scenario-owned dependants`)
  }

  for (const person of fixture.people) {
    const deletion = await transaction.user.deleteMany({
      where: {
        id: person.id,
        email: person.email,
        username: person.username,
        ownedWorlds: { none: {} },
        worldMemberships: { none: {} },
      },
    })

    if (deletion.count === 1) {
      deleted.push(`User ${person.id}`)
      continue
    }

    const stillExists = await transaction.user.findUnique({
      where: { id: person.id },
      select: { id: true },
    })

    if (stillExists) {
      retained.push(
        `User ${person.id} is referenced outside this scenario and was retained`,
      )
    }
  }

  return { deleted, retained }
}
