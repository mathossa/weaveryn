import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type { DevAcceptanceCheck, DevScenario } from '@/dev/scenario-contracts'
import {
  isAuthAccountLifecycleAction,
  type AuthAccountLifecycleAction,
  type AuthAccountLifecycleState,
} from '@/dev/scenarios/auth-account-lifecycle'
import { prisma } from '@/lib/prisma'
import { accountLifecycleService } from '@/server/auth'
import { FixtureOwnershipError } from './fixture-safety'

const metadata = requireDevScenarioMetadata('auth-account-lifecycle')
export const AUTH_SCENARIO_EMAIL = 'dev-auth-account-lifecycle@weaveryn.local'
export const AUTH_SCENARIO_USERNAME = 'auth-lifecycle-tester'
const WORLD_ID = '14000000-0000-4000-8000-000000000010'
const CHARACTER_ID = '14000000-0000-4000-8000-000000000020'
const DISPLAY_NAME = 'Auth Lifecycle Tester'

async function fixtureUser() {
  return prisma.user.findUnique({
    where: { email: AUTH_SCENARIO_EMAIL },
    select: { id: true, email: true, username: true, displayName: true },
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
        ? prisma.authAccount.count({
            where: { userId: user.id, providerId: 'credential' },
          })
        : Promise.resolve(0),
      user
        ? prisma.authSession.count({ where: { userId: user.id } })
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
  if (
    user &&
    (user.displayName !== DISPLAY_NAME ||
      user.username !== AUTH_SCENARIO_USERNAME)
  ) {
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
      if (
        user.displayName !== DISPLAY_NAME ||
        user.username !== AUTH_SCENARIO_USERNAME
      ) {
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

async function runAcceptanceChecks() {
  const checks: DevAcceptanceCheck[] = []
  const initialState = await readState()
  const user = initialState.user

  const usernamePersisted = user?.username === AUTH_SCENARIO_USERNAME
  checks.push({
    id: 'public-username-persisted',
    title: 'Required public username is persisted',
    status: usernamePersisted ? 'passed' : 'failed',
    actor: 'Registered account',
    target: AUTH_SCENARIO_EMAIL,
    expected: `@${AUTH_SCENARIO_USERNAME}`,
    actual: user ? `@${user.username}` : 'No registered scenario User',
    detail:
      'Registration must persist the normalized public username separately from the private account email.',
  })

  const credentialPersisted =
    Boolean(user) && initialState.auth.credentialAccountCount === 1
  checks.push({
    id: 'credential-account-persisted',
    title: 'Better Auth credential account is persisted',
    status: credentialPersisted ? 'passed' : 'failed',
    actor: 'Registered account',
    target: AUTH_SCENARIO_EMAIL,
    expected: 'One credential account linked to the Weaveryn User',
    actual: user
      ? `${initialState.auth.credentialAccountCount} credential account(s)`
      : 'No registered scenario User',
    detail:
      'Registration must create the existing Weaveryn User identity and one Better Auth credential record.',
  })

  const sessionPersisted = Boolean(user) && initialState.auth.sessionCount > 0
  checks.push({
    id: 'session-persisted',
    title: 'Signed-in session is persisted',
    status: sessionPersisted ? 'passed' : 'failed',
    actor: 'Authenticated browser user',
    target: user ? `User ${user.id}` : AUTH_SCENARIO_EMAIL,
    expected: 'At least one Better Auth session for the scenario User',
    actual: user
      ? `${initialState.auth.sessionCount} persisted session(s)`
      : 'No registered scenario User',
    detail:
      'Sign in through the browser before running all checks so the real Better Auth session is present.',
  })

  if (
    !user ||
    !usernamePersisted ||
    !credentialPersisted ||
    !sessionPersisted
  ) {
    checks.push(
      {
        id: 'character-blocks-account-deletion',
        title: 'Owned Character blocks account deletion',
        status: 'pending',
        actor: 'Account lifecycle service',
        target: AUTH_SCENARIO_EMAIL,
        expected: 'CHARACTERS blocker while the fixture Character exists',
        actual: 'Waiting for a registered and signed-in scenario User',
        detail:
          'This check seeds the deterministic World and Character, then executes the real deletion preflight.',
      },
      {
        id: 'resolved-account-can-delete',
        title: 'Resolved account is ready for deletion',
        status: 'pending',
        actor: 'Account lifecycle service',
        target: AUTH_SCENARIO_EMAIL,
        expected:
          'No blockers after resolving the Character; the owned World remains ready to be orphaned',
        actual: 'Waiting for the authentication prerequisites',
        detail:
          'The check resolves only the deterministic Character and leaves the World for the manual deletion/orphaning step.',
      },
    )
    return checks
  }

  await execute({ action: 'seed-world' })
  await execute({ action: 'seed-character' })

  const blockedPreflight =
    await accountLifecycleService.preflightAccountDeletion(user.id)
  const characterBlocksDeletion =
    !blockedPreflight.canDelete &&
    blockedPreflight.blockers.length === 1 &&
    blockedPreflight.blockers[0] === 'CHARACTERS' &&
    blockedPreflight.ownedCampaignCount === 0 &&
    blockedPreflight.ownedCharacterCount === 1 &&
    blockedPreflight.ownedWorldCount === 1

  checks.push({
    id: 'character-blocks-account-deletion',
    title: 'Owned Character blocks account deletion',
    status: characterBlocksDeletion ? 'passed' : 'failed',
    actor: 'Account lifecycle service',
    target: `User ${user.id}`,
    expected:
      'canDelete=false, blocker=CHARACTERS, 1 Character, 1 World, 0 Campaigns',
    actual: JSON.stringify(blockedPreflight),
    detail:
      'Run all checks creates only deterministic scenario fixtures and executes the real account-deletion preflight.',
  })

  await execute({ action: 'resolve-character' })
  const readyPreflight = await accountLifecycleService.preflightAccountDeletion(
    user.id,
  )
  const accountReady =
    readyPreflight.canDelete &&
    readyPreflight.blockers.length === 0 &&
    readyPreflight.ownedCampaignCount === 0 &&
    readyPreflight.ownedCharacterCount === 0 &&
    readyPreflight.ownedWorldCount === 1

  checks.push({
    id: 'resolved-account-can-delete',
    title: 'Resolved account is ready for deletion',
    status: accountReady ? 'passed' : 'failed',
    actor: 'Account lifecycle service',
    target: `User ${user.id}`,
    expected:
      'canDelete=true with no Character/Campaign blockers and the owned World preserved',
    actual: JSON.stringify(readyPreflight),
    detail:
      'The deterministic Character is resolved after the blocker check; the World is intentionally left in place for the manual delete/orphan test.',
  })

  return checks
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
        'Fixture cleaned. Register the deterministic email and username through the real Better Auth endpoint to begin.',
    }
  },
  async cleanup() {
    await cleanupFixture()
    return {
      ok: true,
      message: 'Removed only the deterministic authentication scenario data.',
      cleanup: {
        deleted: [
          'fixture User/auth records',
          'fixture Character',
          'fixture World',
        ],
        retained: ['all non-scenario data'],
      },
    }
  },
  async runAll() {
    const checks = await runAcceptanceChecks()
    const passed = checks.filter((check) => check.status === 'passed').length
    return {
      ok: passed === checks.length,
      message: `${passed}/${checks.length} live acceptance checks passed.`,
      checks,
    }
  },
  isAction: isAuthAccountLifecycleAction,
  execute,
}
