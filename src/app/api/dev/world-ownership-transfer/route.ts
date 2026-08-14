import { NextResponse } from 'next/server'
import { Prisma, WorldRole } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import {
  createWorldOwnershipService,
  transferWorldOwnership,
  WorldOwnershipServiceDatabase,
  WorldOwnershipTransferError,
} from '@/services/worldOwnershipService'
import type {
  AcceptanceCheck,
  FormerOwnerState,
  LabPerson,
  LabResponse,
  LabUserKey,
  LabWorldState,
} from '@/app/dev/world-ownership-transfer/types'

export const runtime = 'nodejs'

const DEV_WORLD_ID = '12000000-0000-4000-8000-000000000001'
const USER_IDS: Record<LabUserKey, string> = {
  A: '12000000-0000-4000-8000-00000000000a',
  B: '12000000-0000-4000-8000-00000000000b',
  C: '12000000-0000-4000-8000-00000000000c',
}

const PEOPLE: Record<LabUserKey, LabPerson> = {
  A: {
    id: USER_IDS.A,
    key: 'A',
    displayName: 'Aria (Owner A)',
    email: 'dev-transfer-a@weaveryn.local',
  },
  B: {
    id: USER_IDS.B,
    key: 'B',
    displayName: 'Bram (Target B)',
    email: 'dev-transfer-b@weaveryn.local',
  },
  C: {
    id: USER_IDS.C,
    key: 'C',
    displayName: 'Cora (Non-owner C)',
    email: 'dev-transfer-c@weaveryn.local',
  },
}

const formerOwnerStates = new Set<FormerOwnerState>([
  'ADMIN',
  'MEMBER',
  'VIEWER',
  'LEAVE',
])

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

function unavailableResponse() {
  return new NextResponse(null, { status: 404 })
}

function personForId(id: string): LabPerson {
  const key = (Object.keys(USER_IDS) as LabUserKey[]).find(
    (candidate) => USER_IDS[candidate] === id
  )

  if (!key) {
    throw new Error(`Unexpected user in ownership-transfer lab: ${id}`)
  }

  return PEOPLE[key]
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

async function safelyReadWorldState() {
  try {
    return await readWorldState()
  } catch {
    return null
  }
}

async function resetScenario() {
  await prisma.$transaction(async (transaction) => {
    await transaction.world.deleteMany({ where: { id: DEV_WORLD_ID } })

    for (const person of Object.values(PEOPLE)) {
      await transaction.user.upsert({
        where: { id: person.id },
        create: {
          id: person.id,
          email: person.email,
          username: `ownership-lab-${person.key.toLowerCase()}`,
          displayName: person.displayName,
        },
        update: {
          email: person.email,
          username: `ownership-lab-${person.key.toLowerCase()}`,
          displayName: person.displayName,
        },
      })
    }

    await transaction.world.create({
      data: {
        id: DEV_WORLD_ID,
        name: 'The Amber Expanse',
        description: 'A deterministic development World for issue #12.',
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

  return readWorldState()
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
            throw new Error('Forced lab failure after the ownership update')
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
  const checks: AcceptanceCheck[] = []

  await resetScenario()
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

  checks.push({
    id: 'non-owner',
    title: 'Non-owners cannot transfer',
    passed: nonOwnerCode === 'NOT_WORLD_OWNER' && nonOwnerPreservedState,
    detail:
      nonOwnerCode === 'NOT_WORLD_OWNER' && nonOwnerPreservedState
        ? 'C was rejected and the World stayed owned by A.'
        : `Unexpected result: ${nonOwnerCode ?? 'no domain error'}.`,
  })

  await resetScenario()
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
      error.message === 'Forced lab failure after the ownership update'
  }

  const afterRollback = await readWorldState()
  const rollbackPreservedState =
    JSON.stringify(stableOwnershipState(beforeRollback)) ===
    JSON.stringify(stableOwnershipState(afterRollback))

  checks.push({
    id: 'rollback',
    title: 'Failure rolls back atomically',
    passed: rollbackFailureObserved && rollbackPreservedState,
    detail:
      rollbackFailureObserved && rollbackPreservedState
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
    await resetScenario()
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
      passed: statePassed,
      detail: statePassed
        ? `B owns the same World; A is ${stateCase.state === 'LEAVE' ? 'not a member' : stateCase.state}.`
        : `Expected A to be ${stateCase.state}, received ${actualFormerOwnerRole ?? 'no membership'}.`,
    })
  }

  checks.push({
    id: 'new-owner-membership',
    title: 'New owner has no membership',
    passed: everyNewOwnerMembershipRemoved,
    detail: everyNewOwnerMembershipRemoved
      ? 'B’s previous membership was removed in every transfer case.'
      : 'B retained a WorldMembership in at least one transfer case.',
  })

  checks.push({
    id: 'never-orphaned',
    title: 'Normal transfer never orphans the World',
    passed: everyTransferKeptAnOwner,
    detail: everyTransferKeptAnOwner
      ? 'Every successful transfer ended with B as the non-null owner.'
      : 'At least one successful transfer left ownerId null.',
  })

  return { checks, state: await readWorldState() }
}

function isTransferRequest(
  value: unknown
): value is {
  action: 'transfer'
  actor: LabUserKey
  formerOwnerState: FormerOwnerState
} {
  if (!value || typeof value !== 'object') {
    return false
  }

  const request = value as Record<string, unknown>
  return (
    request.action === 'transfer' &&
    (request.actor === 'A' || request.actor === 'C') &&
    typeof request.formerOwnerState === 'string' &&
    formerOwnerStates.has(request.formerOwnerState as FormerOwnerState)
  )
}

function errorResponse(error: unknown, state: LabWorldState | null) {
  if (error instanceof WorldOwnershipTransferError) {
    return NextResponse.json<LabResponse>(
      {
        ok: false,
        message: error.message,
        state,
        error: { code: error.code },
      },
      { status: 409 }
    )
  }

  const message = error instanceof Error ? error.message : 'Unknown error'
  return NextResponse.json<LabResponse>(
    {
      ok: false,
      message,
      state,
      error: { code: 'LAB_ERROR' },
    },
    { status: 500 }
  )
}

export async function GET() {
  if (isProduction()) {
    return unavailableResponse()
  }

  try {
    const state = await readWorldState()
    return NextResponse.json<LabResponse>({
      ok: true,
      message: state
        ? 'Loaded the issue #12 development World.'
        : 'Create the development World to begin.',
      state,
    })
  } catch (error) {
    return errorResponse(error, null)
  }
}

export async function POST(request: Request) {
  if (isProduction()) {
    return unavailableResponse()
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json<LabResponse>(
      {
        ok: false,
        message: 'Request body must be valid JSON.',
        state: null,
        error: { code: 'INVALID_REQUEST' },
      },
      { status: 400 }
    )
  }

  try {
    if (
      body &&
      typeof body === 'object' &&
      (body as Record<string, unknown>).action === 'reset'
    ) {
      return NextResponse.json<LabResponse>({
        ok: true,
        message: 'Created the World with A as owner and B as MEMBER.',
        state: await resetScenario(),
      })
    }

    if (
      body &&
      typeof body === 'object' &&
      (body as Record<string, unknown>).action === 'run-all'
    ) {
      const result = await runAcceptanceChecks()
      const passed = result.checks.filter((check) => check.passed).length
      return NextResponse.json<LabResponse>({
        ok: passed === result.checks.length,
        message: `${passed}/${result.checks.length} live acceptance checks passed.`,
        state: result.state,
        checks: result.checks,
      })
    }

    if (!isTransferRequest(body)) {
      return NextResponse.json<LabResponse>(
        {
          ok: false,
          message: 'Unsupported ownership-transfer lab request.',
          state: await readWorldState(),
          error: { code: 'INVALID_REQUEST' },
        },
        { status: 400 }
      )
    }

    await transferWorldOwnership({
      worldId: DEV_WORLD_ID,
      currentOwnerId: USER_IDS[body.actor],
      newOwnerId: USER_IDS.B,
      formerOwnerMembershipRole: roleForState(body.formerOwnerState),
    })

    return NextResponse.json<LabResponse>({
      ok: true,
      message: `${body.actor} transferred ownership to B.`,
      state: await readWorldState(),
    })
  } catch (error) {
    return errorResponse(error, await safelyReadWorldState())
  }
}
