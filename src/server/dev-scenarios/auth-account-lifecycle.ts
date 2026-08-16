import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type { DevAcceptanceCheck, DevScenario } from '@/dev/scenario-contracts'
import {
  isAuthAccountLifecycleAction,
  type AuthAccountLifecycleAction,
  type AuthAccountLifecycleState,
} from '@/dev/scenarios/auth-account-lifecycle'
import { prisma } from '@/lib/prisma'
import { FixtureOwnershipError } from './fixture-safety'

const metadata = requireDevScenarioMetadata('auth-account-lifecycle')
export const AUTH_SCENARIO_EMAIL = 'dev-auth-account-lifecycle@weaveryn.local'
const WORLD_ID = '14000000-0000-4000-8000-000000000010'
const CHARACTER_ID = '14000000-0000-4000-8000-000000000020'
const DISPLAY_NAME = 'Auth Lifecycle Tester'

async function fixtureUser() {
  return prisma.user.findUnique({
    where: { email: AUTH_SCENARIO_EMAIL },
    select: { id: true, email: true, displayName: true },
  })
}

async function readState(): Promise<AuthAccountLifecycleState> {
  const user = await fixtureUser()
  const [world, character, credentialAccountCount, sessionCount] =
    await Promise.all([
      prisma.world.findUnique({
        where: { id: WORLD_ID },
        select: { id: true, ownerId: true, description: true },
      }),
      prisma.character.findUnique({
        where: { id: CHARACTER_ID },
        select: { id: true, ownerUserId: true, name: true },
      }),
      user
        ? prisma.account.count({
            where: { userId: user.id, providerId: 'credential' },
          })
        : Promise.resolve(0),
      user
        ? prisma.session.count({ where: { userId: user.id } })
        : Promise.resolve(0),
    ])

  if (world && world.description !== metadata.fixtureNamespace) {
    throw new FixtureOwnershipError(
      `World ${WORLD_ID} is not owned by this development scenario.`,
    )
  }
  if (character && character.name !== metadata.fixtureNamespace) {
    throw new FixtureOwnershipError(
      `Character ${CHARACTER_ID} is not owned by this development scenario.`,
    )
  }
  if (user && user.displayName !== DISPLAY_NAME) {
    throw new FixtureOwnershipError(
      `User ${user.id} is not owned by this development scenario.`,
    )
  }

  return {
    user,
    auth: { credentialAccountCount, sessionCount },
    ownedWorld: world ? { id: world.id, ownerId: world.ownerId } : null,
    ownedCharacter: character
      ? { id: character.id, ownerUserId: character.ownerUserId }
      : null,
  }
}

async function cleanupFixture() {
  const user = await fixtureUser()

  await prisma.$transaction(async (transaction) => {
    const character = await transaction.character.findUnique({
      where: { id: CHARACTER_ID },
      select: { name: true },
    })
    if (character && character.name !== metadata.fixtureNamespace) {
      throw new FixtureOwnershipError(
        `Character ${CHARACTER_ID} is not owned by this development scenario.`,
      )
    }
    await transaction.character.deleteMany({ where: { id: CHARACTER_ID } })

    const world = await transaction.world.findUnique({
      where: { id: WORLD_ID },
      select: { description: true },
    })
    if (world && world.description !== metadata.fixtureNamespace) {
      throw new FixtureOwnershipError(
        `World ${WORLD_ID} is not owned by this development scenario.`,
      )
    }
    await transaction.world.deleteMany({
      where: { id: WORLD_ID, description: metadata.fixtureNamespace },
    })

    if (user) {
      if (user.displayName !== DISPLAY_NAME) {
        throw new FixtureOwnershipError(
          `User ${user.id} is not owned by this development scenario.`,
        )
      }
      await transaction.user.delete({ where: { id: user.id } })
    }
  })
}

async function execute(action: AuthAccountLifecycleAction) {
  const user = await fixtureUser()
  if (!user) {
    return {
      ok: false,
      message: 'Create the deterministic account through Better Auth first.',
    }
  }

  if (action.action === 'seed-world') {
    const existing = await prisma.world.findUnique({
      where: { id: WORLD_ID },
      select: { description: true },
    })
    if (existing && existing.description !== metadata.fixtureNamespace) {
      throw new FixtureOwnershipError(
        `World ${WORLD_ID} is not owned by this development scenario.`,
      )
    }
    await prisma.world.upsert({
      where: { id: WORLD_ID },
      create: {
        id: WORLD_ID,
        name: 'Auth lifecycle orphaning fixture',
        description: metadata.fixtureNamespace,
        ownerId: user.id,
      },
      update: { ownerId: user.id },
    })
    return { ok: true, message: 'Created an owned World for deletion testing.' }
  }

  if (action.action === 'seed-character') {
    const existing = await prisma.character.findUnique({
      where: { id: CHARACTER_ID },
      select: { name: true },
    })
    if (existing && existing.name !== metadata.fixtureNamespace) {
      throw new FixtureOwnershipError(
        `Character ${CHARACTER_ID} is not owned by this development scenario.`,
      )
    }
    await prisma.character.upsert({
      where: { id: CHARACTER_ID },
      create: {
        id: CHARACTER_ID,
        ownerUserId: user.id,
        name: metadata.fixtureNamespace,
      },
      update: { ownerUserId: user.id, name: metadata.fixtureNamespace },
    })
    return {
      ok: true,
      message: 'Created an owned Character that must block account deletion.',
    }
  }

  await prisma.character.deleteMany({ where: { id: CHARACTER_ID } })
  return { ok: true, message: 'Resolved the owned Character blocker.' }
}

export const authAccountLifecycleScenario: DevScenario<
  AuthAccountLifecycleState,
  AuthAccountLifecycleAction
> = {
  metadata,
  readState,
  async reset() {
    await cleanupFixture()
    return {
      ok: true,
      message:
        'Fixture cleaned. Register the deterministic email through the real Better Auth endpoint to begin.',
    }
  },
  async cleanup() {
    await cleanupFixture()
    return {
      ok: true,
      message: 'Removed only the deterministic authentication scenario data.',
      cleanup: {
        deleted: ['fixture User/auth records', 'fixture Character', 'fixture World'],
        retained: ['all non-scenario data'],
      },
    }
  },
  async runAll() {
    const checks: DevAcceptanceCheck[] = [
      {
        id: 'real-auth-flow',
        title: 'Real Better Auth cookie flow',
        status: 'manual',
        detail:
          'Use the scenario controls to register, log in, inspect the authenticated User, log out, and test account deletion.',
      },
    ]
    return {
      ok: true,
      message: 'Authentication lifecycle requires the browser cookie controls below.',
      checks,
    }
  },
  isAction: isAuthAccountLifecycleAction,
  execute,
}
