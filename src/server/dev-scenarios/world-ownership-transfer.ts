import { Prisma, WorldRole } from '@/generated/prisma/client'
import { getDevScenarioMetadata } from '@/dev/scenario-catalog'
import { prisma } from '@/lib/prisma'
import {
  createWorldOwnershipService,
  transferWorldOwnership,
  type WorldOwnershipServiceDatabase,
  WorldOwnershipTransferError,
} from '@/services/worldOwnershipService'
import type {
  FormerOwnerState,
  LabPerson,
  LabUserKey,
  LabWorldState,
} from '@/app/dev/world-ownership-transfer/types'
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

const metadata = getDevScenarioMetadata('world-ownership-transfer')!
const DEV_WORLD_ID = '12000000-0000-4000-8000-000000000001'
const USER_IDS: Record<LabUserKey, string> = {
  A: '12000000-0000-4000-8000-00000000000a',
  B: '12000000-0000-4000-8000-00000000000b',
  C: '12000000-0000-4000-8000-00000000000c',
}

const PEOPLE: Record<LabUserKey, LabPerson & { username: string }> = {
  A: {
    id: USER_IDS.A,
    key: 'A',
    displayName: 'Aria (Owner A)',
    email: 'dev-transfer-a@weaveryn.local',
    username: 'ownership-lab-a',
  },
  B: {
    id: USER_IDS.B,
    key: 'B',
    displayName: 'Bram (Target B)',
    email: 'dev-transfer-b@weaveryn.local',
    username: 'ownership-lab-b',
  },
  C: {
    id: USER_IDS.C,
    key: 'C',
    displayName: 'Cora (Non-owner C)',
    email: 'dev-transfer-c@weaveryn.local',
    username: 'ownership-lab-c',
  },
}

const fixture: WorldFixtureDefinition = {
  scenarioId: metadata.id,
  worldId: DEV_WORLD_ID,
  worldMarker: metadata.fixtureNamespace,
  people: Object.values(PEOPLE),
}

const formerOwnerStates = new Set<FormerOwnerState>([
  'ADMIN',
  'MEMBER',
  'VIEWER',
  'LEAVE',
])

function personForId(id: string): LabPerson {
  const key = (Object.keys(USER_IDS) as LabUserKey[]).find(
    (candidate) => USER_IDS[candidate] === id
  )

  if (!key) {
    throw new FixtureOwnershipError(
      `Unexpected user in ownership-transfer scenario: ${id}`
    )
  }

  const person = PEOPLE[key]
  return {
    id: person.id,
    key: person.key,
    displayName: person.displayName,
    email: person.email,
  }
}

async function readWorldState(): Promise<LabWorldState | null> {
  const world = await prisma.world.findUnique({
    where: { id: DEV_WORLD_ID },
    include: {
      owner: { select: { id: true } },
      memberships: {
        orderBy: { userId: 'asc' },
        select: {
          role: true,
          user: { select: { id: true } },
        },
      },
    },
  })

  if (!world) {
    return null
  }

  if (world.description !== fixture.worldMarker) {
    throw new FixtureOwnershipError(
      `World ${DEV_WORLD_ID} is not owned by this development scenario.`
    )
  }

  return {
    id: world.id,
    name: world.name,
    owner: world.owner ? personForId(world.owner.id) : null,
    memberships: world.memberships.map((membership) => ({
      role: membership.role,
      user: personForId(membership.user.id),
    })),
  }
}

async function resetFixture() {
  await prisma.$transaction(async (transaction) => {
    await assertWorldFixtureOwned(transaction, fixture)
    await transaction.world.deleteMany({
      where: {
        id: DEV_WORLD_ID,
        description: fixture.worldMarker,
      },
    })
    await upsertFixturePeople(transaction, fixture.people)

    await transaction.world.create({
      data: {
        id: DEV_WORLD_ID,
        name: 'The Amber Expanse',
        description: fixture.worldMarker,
        ownerId: USER_IDS.A,
        timelines: {
          create: { name: 'Main' },
        },
        memberships: {
          create: {
            userId: USER_IDS.B,
            role: WorldRole.MEMBER,
          },
        },
      },
    })
  })
}

function roleForState(state: FormerOwnerState) {
  return state === 'LEAVE' ? null : WorldRole[state]
}

function membershipRole(state: LabWorldState | null, userKey: LabUserKey) {
  return state?.memberships.find(
    (membership) => membership.user.id === USER_IDS[userKey]
  )?.role
}

function stableOwnershipState(state: LabWorldState | null) {
  return {
    ownerId: state?.owner?.id ?? null,
    memberships:
      state?.memberships.map((membership) => ({
        userId: membership.user.id,
        role: membership.role,
      })) ?? [],
  }
}

function createRollbackDatabase(): WorldOwnershipServiceDatabase {
  const transaction = async <T>(
    operation: (client: Prisma.TransactionClient) => Promise<T>
  ) =>
    prisma.$transaction(async (client) => {
      const failingClient = {
        world: client.world,
        user: client.user,
        worldMembership: {
          deleteMany: client.worldMembership.deleteMany.bind(
            client.worldMembership
          ),
          upsert: async () => {
            throw new Error('Forced scenario failure after ownership update')
          },
        },
      } as unknown as Prisma.TransactionClient

      return operation(failingClient)
    })

  return {
    $transaction: transaction as WorldOwnershipServiceDatabase['$transaction'],
  }
}

async function runAcceptanceChecks() {
  const checks: DevAcceptanceCheck[] = []

  await resetFixture()
  let nonOwnerCode: string | null = null

  try {
    await transferWorldOwnership({
      worldId: DEV_WORLD_ID,
      currentOwnerId: USER_IDS.C,
      newOwnerId: USER_IDS.B,
      formerOwnerMembershipRole: WorldRole.ADMIN,
    })
  } catch (error) {
    if (error instanceof WorldOwnershipTransferError) {
      nonOwnerCode = error.code
    } else {
      throw error
    }
  }

  const afterNonOwnerAttempt = await readWorldState()
  const nonOwnerPreservedState =
    afterNonOwnerAttempt?.owner?.id === USER_IDS.A &&
    membershipRole(afterNonOwnerAttempt, 'B') === WorldRole.MEMBER
  const nonOwnerPassed =
    nonOwnerCode === 'NOT_WORLD_OWNER' && nonOwnerPreservedState

  checks.push({
    id: 'non-owner',
    title: 'Non-owners cannot transfer',
    status: nonOwnerPassed ? 'passed' : 'failed',
    actor: PEOPLE.C.displayName,
    target: `World ${DEV_WORLD_ID}`,
    expected: 'NOT_WORLD_OWNER and unchanged ownership',
    actual: nonOwnerPassed
      ? 'C rejected; A remains owner'
      : `${nonOwnerCode ?? 'no domain error'}; fixture state mismatch`,
    domainErrorCode: nonOwnerCode,
    detail: nonOwnerPassed
      ? 'C was rejected and the World stayed owned by A.'
      : 'The non-owner rejection did not preserve the expected state.',
  })

  await resetFixture()
  const beforeRollback = await readWorldState()
  let rollbackFailureObserved = false

  try {
    const rollbackService = createWorldOwnershipService(
      createRollbackDatabase()
    )
    await rollbackService.transferWorldOwnership({
      worldId: DEV_WORLD_ID,
      currentOwnerId: USER_IDS.A,
      newOwnerId: USER_IDS.B,
      formerOwnerMembershipRole: WorldRole.ADMIN,
    })
  } catch (error) {
    rollbackFailureObserved =
      error instanceof Error &&
      error.message === 'Forced scenario failure after ownership update'
  }

  const afterRollback = await readWorldState()
  const rollbackPreservedState =
    JSON.stringify(stableOwnershipState(beforeRollback)) ===
    JSON.stringify(stableOwnershipState(afterRollback))
  const rollbackPassed = rollbackFailureObserved && rollbackPreservedState

  checks.push({
    id: 'rollback',
    title: 'Failure rolls back atomically',
    status: rollbackPassed ? 'passed' : 'failed',
    actor: PEOPLE.A.displayName,
    target: `World ${DEV_WORLD_ID}`,
    expected: 'Forced write failure leaves complete state unchanged',
    actual: rollbackPassed ? 'Complete state unchanged' : 'State changed',
    detail: rollbackPassed
      ? 'A forced failure occurred after the update; A remained owner and B remained a MEMBER.'
      : 'The forced failure did not preserve the complete ownership state.',
  })

  let everyNewOwnerMembershipRemoved = true
  let everyTransferKeptAnOwner = true
  const stateCases: Array<{
    state: FormerOwnerState
    expectedRole: WorldRole | undefined
  }> = [
    { state: 'ADMIN', expectedRole: WorldRole.ADMIN },
    { state: 'VIEWER', expectedRole: WorldRole.VIEWER },
    { state: 'LEAVE', expectedRole: undefined },
    { state: 'MEMBER', expectedRole: WorldRole.MEMBER },
  ]

  for (const stateCase of stateCases) {
    await resetFixture()
    await transferWorldOwnership({
      worldId: DEV_WORLD_ID,
      currentOwnerId: USER_IDS.A,
      newOwnerId: USER_IDS.B,
      formerOwnerMembershipRole: roleForState(stateCase.state),
    })

    const state = await readWorldState()
    const actualFormerOwnerRole = membershipRole(state, 'A')
    const statePassed =
      state?.owner?.id === USER_IDS.B &&
      actualFormerOwnerRole === stateCase.expectedRole

    everyNewOwnerMembershipRemoved =
      everyNewOwnerMembershipRemoved &&
      membershipRole(state, 'B') === undefined
    everyTransferKeptAnOwner =
      everyTransferKeptAnOwner && state?.owner !== null

    checks.push({
      id: `former-owner-${stateCase.state.toLowerCase()}`,
      title:
        stateCase.state === 'LEAVE'
          ? 'Former owner can leave'
          : `Former owner can become ${stateCase.state}`,
      status: statePassed ? 'passed' : 'failed',
      actor: PEOPLE.A.displayName,
      target: `World ${DEV_WORLD_ID}`,
      expected: `B owns the World; A is ${stateCase.state}`,
      actual: `Owner ${state?.owner?.key ?? 'none'}; A is ${actualFormerOwnerRole ?? 'not a member'}`,
      detail: statePassed
        ? `B owns the same World; A is ${stateCase.state === 'LEAVE' ? 'not a member' : stateCase.state}.`
        : `Expected A to be ${stateCase.state}, received ${actualFormerOwnerRole ?? 'no membership'}.`,
    })
  }

  checks.push({
    id: 'new-owner-membership',
    title: 'New owner has no membership',
    status: everyNewOwnerMembershipRemoved ? 'passed' : 'failed',
    actor: PEOPLE.A.displayName,
    target: PEOPLE.B.displayName,
    expected: 'No WorldMembership for the new owner',
    actual: everyNewOwnerMembershipRemoved
      ? 'No membership in every transfer case'
      : 'Membership retained in at least one case',
    detail: everyNewOwnerMembershipRemoved
      ? 'B’s previous membership was removed in every transfer case.'
      : 'B retained a WorldMembership in at least one transfer case.',
  })

  checks.push({
    id: 'never-orphaned',
    title: 'Normal transfer never orphans the World',
    status: everyTransferKeptAnOwner ? 'passed' : 'failed',
    actor: PEOPLE.A.displayName,
    target: `World ${DEV_WORLD_ID}`,
    expected: 'Non-null owner after every successful transfer',
    actual: everyTransferKeptAnOwner
      ? 'B owned every final state'
      : 'At least one final state was orphaned',
    detail: everyTransferKeptAnOwner
      ? 'Every successful transfer ended with B as the non-null owner.'
      : 'At least one successful transfer left ownerId null.',
  })

  return checks
}

function isTransferRequest(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false
  }

  const request = value as Record<string, unknown>
  const keys = Object.keys(request).sort()

  return (
    keys.length === 3 &&
    keys[0] === 'action' &&
    keys[1] === 'actor' &&
    keys[2] === 'formerOwnerState' &&
    request.action === 'transfer' &&
    (request.actor === 'A' || request.actor === 'C') &&
    typeof request.formerOwnerState === 'string' &&
    formerOwnerStates.has(request.formerOwnerState as FormerOwnerState)
  )
}

export const worldOwnershipTransferScenario: DevScenario = {
  metadata,
  readState: readWorldState,
  async reset() {
    await resetFixture()
    return {
      ok: true,
      message: 'Created the World with A as owner and B as MEMBER.',
      activity: {
        action: 'reset',
        actor: 'Development fixture runner',
        target: `World ${DEV_WORLD_ID}`,
        expected: 'Known issue #12 starting state',
        actual: 'A owns the World; B is MEMBER',
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
        : 'All disposable ownership-transfer scenario data was removed.',
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
      message: `${passed}/${checks.length} live acceptance checks passed.`,
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
  isAction: isTransferRequest,
  async execute(value) {
    const request = value as {
      action: 'transfer'
      actor: 'A' | 'C'
      formerOwnerState: FormerOwnerState
    }
    await transferWorldOwnership({
      worldId: DEV_WORLD_ID,
      currentOwnerId: USER_IDS[request.actor],
      newOwnerId: USER_IDS.B,
      formerOwnerMembershipRole: roleForState(request.formerOwnerState),
    })
    const state = await readWorldState()

    return {
      ok: true,
      message: `${request.actor} transferred ownership to B.`,
      activity: {
        action: request.action,
        actor: PEOPLE[request.actor].displayName,
        target: `World ${DEV_WORLD_ID}`,
        expected: `B becomes owner; A becomes ${request.formerOwnerState}`,
        actual: `Owner ${state?.owner?.key ?? 'none'}; A is ${membershipRole(state, 'A') ?? 'not a member'}`,
        status: 'passed',
      },
    }
  },
  mapError(error, action) {
    if (error instanceof WorldOwnershipTransferError) {
      const actor =
        action && typeof action === 'object'
          ? (action as Record<string, unknown>).actor
          : undefined
      const expectedRejection =
        actor === 'C' && error.code === 'NOT_WORLD_OWNER'

      return {
        code: error.code,
        message: error.message,
        status: 409,
        activity: {
          action: 'transfer',
          actor:
            actor === 'A' || actor === 'C'
              ? PEOPLE[actor].displayName
              : 'Requested scenario actor',
          target: `World ${DEV_WORLD_ID}`,
          expected: 'Domain service determines the outcome',
          actual: `Rejected with ${error.code}`,
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
