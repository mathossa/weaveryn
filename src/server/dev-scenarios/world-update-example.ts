import { getDevScenarioMetadata } from '@/dev/scenario-catalog'
import { prisma } from '@/lib/prisma'
import {
  worldService,
  WorldUpdateForbiddenError,
} from '@/services/worldService'
import type {
  DevAcceptanceCheck,
  DevScenario,
} from './contracts'
import { FixtureOwnershipError } from './fixture-safety'
import {
  assertWorldFixtureOwned,
  cleanupWorldFixture,
  upsertFixturePeople,
  type WorldFixtureDefinition,
} from './world-fixture'

const metadata = getDevScenarioMetadata('world-update-example')!
const WORLD_ID = '34000000-0000-4000-8000-000000000001'
const OWNER_ID = '34000000-0000-4000-8000-00000000000a'
const OUTSIDER_ID = '34000000-0000-4000-8000-00000000000b'
const INITIAL_NAME = 'The Reusable Archive'
const UPDATED_NAME = 'The Moonlit Archive'

const fixture: WorldFixtureDefinition = {
  scenarioId: metadata.id,
  worldId: WORLD_ID,
  worldMarker: metadata.fixtureNamespace,
  people: [
    {
      id: OWNER_ID,
      email: 'dev-world-update-owner@weaveryn.local',
      username: 'world-update-lab-owner',
      displayName: 'Uma (World owner)',
    },
    {
      id: OUTSIDER_ID,
      email: 'dev-world-update-outsider@weaveryn.local',
      username: 'world-update-lab-outsider',
      displayName: 'Oren (Outsider)',
    },
  ],
}

async function readState() {
  const world = await prisma.world.findUnique({
    where: { id: WORLD_ID },
    select: {
      id: true,
      name: true,
      description: true,
      ownerId: true,
    },
  })

  if (!world) {
    return null
  }

  if (world.description !== fixture.worldMarker) {
    throw new FixtureOwnershipError(
      `World ${WORLD_ID} is not owned by this development scenario.`
    )
  }

  return {
    id: world.id,
    name: world.name,
    ownerId: world.ownerId,
  }
}

async function resetFixture() {
  await prisma.$transaction(async (transaction) => {
    await assertWorldFixtureOwned(transaction, fixture)
    await transaction.world.deleteMany({
      where: { id: WORLD_ID, description: fixture.worldMarker },
    })
    await upsertFixturePeople(transaction, fixture.people)
    await transaction.world.create({
      data: {
        id: WORLD_ID,
        name: INITIAL_NAME,
        description: fixture.worldMarker,
        ownerId: OWNER_ID,
        timelines: { create: { name: 'Main' } },
      },
    })
  })
}

function isRenameAction(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false
  }

  const request = value as Record<string, unknown>
  const keys = Object.keys(request).sort()
  return (
    keys.length === 2 &&
    keys[0] === 'action' &&
    keys[1] === 'actor' &&
    request.action === 'rename' &&
    (request.actor === 'OWNER' || request.actor === 'OUTSIDER')
  )
}

async function runAcceptanceChecks() {
  const checks: DevAcceptanceCheck[] = []

  await resetFixture()
  await worldService.updateWorld(WORLD_ID, OWNER_ID, { name: UPDATED_NAME })
  const afterOwnerUpdate = await readState()
  const ownerPassed = afterOwnerUpdate?.name === UPDATED_NAME

  checks.push({
    id: 'owner-update',
    title: 'Owner can update the World',
    status: ownerPassed ? 'passed' : 'failed',
    actor: 'Uma (World owner)',
    target: `World ${WORLD_ID}`,
    expected: UPDATED_NAME,
    actual: afterOwnerUpdate?.name ?? 'World missing',
    detail: ownerPassed
      ? 'The shared production World service persisted the update.'
      : 'The production service did not persist the expected name.',
  })

  await resetFixture()
  let outsiderCode: string | null = null

  try {
    await worldService.updateWorld(WORLD_ID, OUTSIDER_ID, {
      name: UPDATED_NAME,
    })
  } catch (error) {
    if (error instanceof WorldUpdateForbiddenError) {
      outsiderCode = error.code
    } else {
      throw error
    }
  }

  const afterOutsiderUpdate = await readState()
  const outsiderPassed =
    outsiderCode === 'WORLD_UPDATE_FORBIDDEN' &&
    afterOutsiderUpdate?.name === INITIAL_NAME

  checks.push({
    id: 'outsider-update',
    title: 'Outsider cannot update the World',
    status: outsiderPassed ? 'passed' : 'failed',
    actor: 'Oren (Outsider)',
    target: `World ${WORLD_ID}`,
    expected: 'WORLD_UPDATE_FORBIDDEN and unchanged name',
    actual: `${outsiderCode ?? 'no domain error'}; ${afterOutsiderUpdate?.name ?? 'World missing'}`,
    domainErrorCode: outsiderCode,
    detail: outsiderPassed
      ? 'The service rejected the outsider and preserved the fixture state.'
      : 'The rejection or persisted state differed from the expectation.',
  })

  return checks
}

export const worldUpdateExampleScenario: DevScenario = {
  metadata,
  readState,
  async reset() {
    await resetFixture()
    return {
      ok: true,
      message: 'Created the deterministic World update fixture.',
      activity: {
        action: 'reset',
        actor: 'Development fixture runner',
        target: `World ${WORLD_ID}`,
        expected: INITIAL_NAME,
        actual: INITIAL_NAME,
        status: 'passed',
      },
    }
  },
  async cleanup() {
    const cleanup = await prisma.$transaction((transaction) =>
      cleanupWorldFixture(transaction, fixture)
    )
    return {
      ok: true,
      message: cleanup.retained.length
        ? 'Scenario data was cleaned; referenced fixture users were intentionally retained.'
        : 'All disposable World update scenario data was removed.',
      cleanup,
      activity: {
        action: 'cleanup',
        actor: 'Developer',
        target: metadata.fixtureNamespace,
        expected: 'Delete only scenario-owned disposable records',
        actual: `${cleanup.deleted.length} deleted; ${cleanup.retained.length} retained`,
        status: 'passed',
      },
    }
  },
  async runAll() {
    const checks = await runAcceptanceChecks()
    const passed = checks.filter((check) => check.status === 'passed').length
    return {
      ok: passed === checks.length,
      message: `${passed}/${checks.length} example checks passed.`,
      checks,
      activity: {
        action: 'run-all',
        actor: 'Acceptance runner',
        target: metadata.title,
        expected: `${checks.length} passing checks`,
        actual: `${passed}/${checks.length} passed`,
        status: passed === checks.length ? 'passed' : 'failed',
      },
    }
  },
  isAction: isRenameAction,
  async execute(value) {
    const request = value as { action: 'rename'; actor: 'OWNER' | 'OUTSIDER' }
    const actorId = request.actor === 'OWNER' ? OWNER_ID : OUTSIDER_ID
    await worldService.updateWorld(WORLD_ID, actorId, { name: UPDATED_NAME })
    const state = await readState()

    return {
      ok: true,
      message: `${request.actor} updated the World through the production service.`,
      activity: {
        action: request.action,
        actor: request.actor === 'OWNER' ? 'Uma (World owner)' : 'Oren (Outsider)',
        target: `World ${WORLD_ID}`,
        expected: UPDATED_NAME,
        actual: state?.name ?? 'World missing',
        status: state?.name === UPDATED_NAME ? 'passed' : 'failed',
      },
    }
  },
  mapError(error, action) {
    if (error instanceof WorldUpdateForbiddenError) {
      const actor =
        action && typeof action === 'object'
          ? (action as Record<string, unknown>).actor
          : undefined
      const expectedRejection = actor === 'OUTSIDER'

      return {
        code: error.code,
        message: error.message,
        status: 403,
        activity: {
          action: 'rename',
          actor:
            actor === 'OWNER'
              ? 'Uma (World owner)'
              : actor === 'OUTSIDER'
                ? 'Oren (Outsider)'
                : 'Requested scenario actor',
          target: `World ${WORLD_ID}`,
          expected: 'WORLD_UPDATE_FORBIDDEN',
          actual: 'WORLD_UPDATE_FORBIDDEN',
          domainErrorCode: error.code,
          status: expectedRejection ? 'passed' : 'failed',
        },
      }
    }

    if (error instanceof FixtureOwnershipError) {
      return {
        code: error.code,
        message: error.message,
        status: 409,
      }
    }

    return null
  },
}
