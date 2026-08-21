import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type { DevAcceptanceCheck, DevScenario } from '@/dev/scenario-contracts'
import {
  isWorldEventsAction,
  type WorldEventsAction,
  type WorldEventsState,
} from '@/dev/scenarios/world-events'
import { prisma } from '@/lib/prisma'
import {
  PrismaWorldEventRepository,
  WorldEventDomainError,
  WorldEventService,
} from '@/server/world-events'
import { MAIN_WORLD_TIMELINE_NAME, WorldDomainError } from '@/server/worlds'
import { FixtureOwnershipError } from './fixture-safety'
import {
  assertWorldFixtureOwned,
  cleanupWorldFixture,
  upsertFixturePeople,
  type WorldFixtureDefinition,
} from './world-fixture'

const metadata = requireDevScenarioMetadata('world-events')
const WORLD_ID = '11300000-0000-4000-8000-000000000001'
const TIMELINE_ID = '11300000-0000-4000-8000-000000000002'
const MEMBER_MEMBERSHIP_ID = '11300000-0000-4000-8000-000000000003'
const VIEWER_MEMBERSHIP_ID = '11300000-0000-4000-8000-000000000004'
const OWNER_ID = '11300000-0000-4000-8000-00000000000a'
const MEMBER_ID = '11300000-0000-4000-8000-00000000000b'
const VIEWER_ID = '11300000-0000-4000-8000-00000000000c'
const KEEP_ID = '11300000-0000-4000-8000-000000000020'
const LEGION_ID = '11300000-0000-4000-8000-000000000021'
const POINT_EVENT_ID = '11300000-0000-4000-8000-000000000030'
const DURATION_EVENT_ID = '11300000-0000-4000-8000-000000000031'
const RECKONING_ID = '11300000-0000-4000-8000-000000000040'
const WORLD_NAME = 'Moonwatch Timeline Laboratory'

const fixture: WorldFixtureDefinition = {
  worldId: WORLD_ID,
  worldMarker: metadata.fixtureNamespace,
  people: [
    {
      id: OWNER_ID,
      email: 'dev-world-events-owner@weaveryn.local',
      username: 'world-events-owner',
      displayName: 'Elara (World owner)',
    },
    {
      id: MEMBER_ID,
      email: 'dev-world-events-member@weaveryn.local',
      username: 'world-events-threadwalker',
      displayName: 'Bodwick (Threadwalker)',
    },
    {
      id: VIEWER_ID,
      email: 'dev-world-events-viewer@weaveryn.local',
      username: 'world-events-threadwatcher',
      displayName: 'Sera (Threadwatcher)',
    },
  ],
}

function serviceFor(id: string) {
  return new WorldEventService(new PrismaWorldEventRepository(prisma), () => id)
}

async function readState(): Promise<WorldEventsState | null> {
  const world = await prisma.world.findUnique({
    where: { id: WORLD_ID },
    select: {
      id: true,
      name: true,
      description: true,
      timelines: {
        where: { id: TIMELINE_ID },
        select: { id: true, name: true },
        take: 1,
      },
      reckonings: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          anchorWorldPosition: true,
          anchorWorldDateLabel: true,
          beforeAbbreviation: true,
          afterAbbreviation: true,
        },
      },
      entities: {
        where: { id: { in: [KEEP_ID, LEGION_ID] } },
        orderBy: { id: 'asc' },
        select: { id: true, name: true, type: true },
      },
    },
  })
  if (!world) return null
  if (world.description !== metadata.fixtureNamespace) {
    throw new FixtureOwnershipError(
      `World ${WORLD_ID} is not owned by the World events scenario.`,
    )
  }

  const timeline = world.timelines[0]
  if (!timeline) {
    throw new FixtureOwnershipError(
      `Timeline ${TIMELINE_ID} is missing from the World events scenario.`,
    )
  }

  const events = await prisma.worldEvent.findMany({
    where: { timelineId: TIMELINE_ID },
    orderBy: [{ startWorldPosition: 'asc' }, { id: 'asc' }],
    include: { entities: { select: { worldEntityId: true } } },
  })

  return {
    world: { id: world.id, name: world.name },
    timeline,
    reckonings: world.reckonings.map((reckoning) => ({
      ...reckoning,
      anchorWorldPosition: reckoning.anchorWorldPosition.toString(),
    })),
    entities: world.entities,
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      startWorldPosition: event.startWorldPosition.toString(),
      endWorldPosition: event.endWorldPosition?.toString() ?? null,
      startWorldDateLabel: event.startWorldDateLabel,
      endWorldDateLabel: event.endWorldDateLabel,
      entityIds: event.entities.map((link) => link.worldEntityId).sort(),
    })),
  }
}

async function resetFixture() {
  await prisma.$transaction(async (transaction) => {
    await assertWorldFixtureOwned(transaction, fixture)
    await transaction.world.deleteMany({
      where: { id: WORLD_ID, description: metadata.fixtureNamespace },
    })
    await upsertFixturePeople(transaction, fixture.people)
    await transaction.world.create({
      data: {
        id: WORLD_ID,
        name: WORLD_NAME,
        description: metadata.fixtureNamespace,
        ownerId: OWNER_ID,
        timelines: {
          create: { id: TIMELINE_ID, name: MAIN_WORLD_TIMELINE_NAME },
        },
        memberships: {
          create: [
            {
              id: MEMBER_MEMBERSHIP_ID,
              userId: MEMBER_ID,
              role: 'MEMBER',
            },
            {
              id: VIEWER_MEMBERSHIP_ID,
              userId: VIEWER_ID,
              role: 'VIEWER',
            },
          ],
        },
        entities: {
          create: [
            {
              id: KEEP_ID,
              type: 'Location',
              name: 'Moonwatch Keep',
              description: 'A fortress used by the timeline scenario.',
              createdById: OWNER_ID,
              visibilityScope: 'WORLD',
            },
            {
              id: LEGION_ID,
              type: 'Faction',
              name: 'Red Legion',
              description: 'A faction used by the timeline scenario.',
              createdById: OWNER_ID,
              visibilityScope: 'WORLD',
            },
          ],
        },
      },
    })
  })
}

async function createPoint(actorId: string) {
  return serviceFor(POINT_EVENT_ID).createEvent({
    actorUserId: actorId,
    worldId: WORLD_ID,
    title: 'Fall of Moonwatch',
    description: 'The Red Legion captures Moonwatch Keep.',
    startDate: { year: '1247' },
    entityIds: [KEEP_ID, LEGION_ID],
  })
}

async function createDuration(actorId: string) {
  return serviceFor(DURATION_EVENT_ID).createEvent({
    actorUserId: actorId,
    worldId: WORLD_ID,
    title: 'The War of Ash',
    description: 'A long conflict whose span is visible in canonical history.',
    startDate: { year: '1249' },
    endDate: { year: '1253' },
    entityIds: [LEGION_ID],
  })
}

async function createReckoning() {
  return serviceFor(RECKONING_ID).createReckoning({
    actorUserId: OWNER_ID,
    worldId: WORLD_ID,
    name: 'Cataclysm Reckoning',
    anchorDate: { year: '1200' },
    beforeLabel: 'Before Cataclysm',
    beforeAbbreviation: 'BC',
    afterLabel: 'After Cataclysm',
    afterAbbreviation: 'AC',
  })
}

async function runAcceptanceChecks() {
  const checks: DevAcceptanceCheck[] = []
  await resetFixture()

  const point = await createPoint(MEMBER_ID)
  checks.push({
    id: 'threadwalker-point',
    title: 'Threadwalker creates a point event with two entity links',
    status:
      point.startWorldPosition === '1247' && point.entityIds.length === 2
        ? 'passed'
        : 'failed',
    actor: 'Bodwick (Threadwalker)',
    target: WORLD_NAME,
    expected: 'Year 1247 point event linked to Moonwatch Keep and Red Legion',
    actual: `${point.startWorldDateLabel}; ${point.entityIds.length} links`,
    detail: 'The production service owns event creation and link persistence.',
  })

  const duration = await createDuration(MEMBER_ID)
  checks.push({
    id: 'duration-event',
    title: 'Duration event persists start and end chronology',
    status:
      duration.startWorldPosition === '1249' &&
      duration.endWorldPosition === '1253'
        ? 'passed'
        : 'failed',
    actor: 'Bodwick (Threadwalker)',
    target: 'The War of Ash',
    expected: 'Year 1249 through Year 1253',
    actual: `${duration.startWorldDateLabel} through ${duration.endWorldDateLabel}`,
    detail: 'A single canonical event record represents a span rather than a view-specific copy.',
  })

  const reckoning = await createReckoning()
  const labeled = await serviceFor('11300000-0000-4000-8000-000000000032').createEvent(
    {
      actorUserId: MEMBER_ID,
      worldId: WORLD_ID,
      title: 'The First New Dawn',
      startDate: {
        year: '50',
        reckoningId: reckoning.id,
        direction: 'AFTER',
      },
    },
  )
  checks.push({
    id: 'named-reckoning',
    title: 'Named reckoning resolves to canonical chronology',
    status:
      labeled.startWorldPosition === '1250' &&
      labeled.startWorldDateLabel === '50 AC'
        ? 'passed'
        : 'failed',
    actor: 'Elara configures; Bodwick authors',
    target: 'Cataclysm Reckoning',
    expected: '50 AC resolves to canonical position 1250',
    actual: `${labeled.startWorldDateLabel} -> ${labeled.startWorldPosition}`,
    detail: 'The human-facing notation resolves through the same canonical coordinate used for sorting.',
  })

  let invalidCode: string | null = null
  try {
    await serviceFor('11300000-0000-4000-8000-000000000033').createEvent({
      actorUserId: MEMBER_ID,
      worldId: WORLD_ID,
      title: 'Impossible War',
      startDate: { year: '1300' },
      endDate: { year: '1299' },
    })
  } catch (error) {
    if (error instanceof WorldEventDomainError) invalidCode = error.code
    else throw error
  }
  checks.push({
    id: 'invalid-duration',
    title: 'End-before-start is rejected',
    status: invalidCode === 'WORLD_EVENT_END_BEFORE_START' ? 'passed' : 'failed',
    actor: 'Bodwick (Threadwalker)',
    target: 'Impossible War',
    expected: 'WORLD_EVENT_END_BEFORE_START',
    actual: invalidCode ?? 'no domain error',
    domainErrorCode: invalidCode,
    detail: 'Chronology validation fails closed before an impossible duration is persisted.',
  })

  let viewerCode: string | null = null
  try {
    await createPoint(VIEWER_ID)
  } catch (error) {
    if (error instanceof WorldDomainError) viewerCode = error.code
    else throw error
  }
  checks.push({
    id: 'threadwatcher-read-only',
    title: 'Threadwatcher cannot alter canonical history',
    status: viewerCode === 'WORLD_PERMISSION_DENIED' ? 'passed' : 'failed',
    actor: 'Sera (Threadwatcher)',
    target: WORLD_NAME,
    expected: 'WORLD_PERMISSION_DENIED',
    actual: viewerCode ?? 'no domain error',
    domainErrorCode: viewerCode,
    detail: 'VIEW_WORLD permits inspection while EDIT_CONTENT remains denied.',
  })

  const reloaded = await serviceFor(POINT_EVENT_ID).loadMainTimeline(
    WORLD_ID,
    MEMBER_ID,
  )
  const positions = reloaded.events.map((event) => event.startWorldPosition)
  const sorted = [...positions].sort((left, right) =>
    BigInt(left) < BigInt(right) ? -1 : BigInt(left) > BigInt(right) ? 1 : 0,
  )
  checks.push({
    id: 'persisted-order',
    title: 'Persisted history reloads in chronological order',
    status: JSON.stringify(positions) === JSON.stringify(sorted) ? 'passed' : 'failed',
    actor: 'Bodwick (Threadwalker)',
    target: MAIN_WORLD_TIMELINE_NAME,
    expected: 'Events reload ordered by canonical start position',
    actual: positions.join(', '),
    detail: 'The main timeline list uses persisted canonical positions rather than insertion order.',
  })

  return checks
}

export const worldEventsScenario: DevScenario<WorldEventsState, WorldEventsAction> = {
  metadata,
  readState,
  async reset() {
    await resetFixture()
    return {
      ok: true,
      message: 'Created the deterministic World history fixture.',
      activity: {
        action: 'reset',
        actor: 'Development fixture runner',
        target: WORLD_NAME,
        expected: 'World, main timeline, Threadwalker, Threadwatcher, two entities, and no events',
        actual: 'Fixture restored with an empty canonical history',
        status: 'passed',
      },
    }
  },
  async cleanup() {
    const cleanup = await prisma.$transaction((transaction) =>
      cleanupWorldFixture(transaction, fixture),
    )
    return {
      ok: true,
      message: 'World events scenario data cleaned.',
      cleanup,
      activity: {
        action: 'cleanup',
        actor: 'Developer',
        target: metadata.fixtureNamespace,
        expected: 'Delete only scenario-owned World history data',
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
      message: `${passed}/${checks.length} World history checks passed.`,
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
  isAction: isWorldEventsAction,
  async execute(request) {
    const actorId = request.actor === 'MEMBER' ? MEMBER_ID : VIEWER_ID
    if (request.action === 'create-point') {
      const event = await createPoint(actorId)
      return {
        ok: true,
        message: 'Created the point event through WorldEventService.',
        activity: {
          action: request.action,
          actor: request.actor === 'MEMBER' ? 'Bodwick (Threadwalker)' : 'Sera (Threadwatcher)',
          target: WORLD_NAME,
          expected: request.actor === 'MEMBER' ? 'Point event created' : 'WORLD_PERMISSION_DENIED',
          actual: `${event.title} at ${event.startWorldDateLabel}`,
          status: request.actor === 'MEMBER' ? 'passed' : 'failed',
        },
      }
    }
    if (request.action === 'create-duration') {
      const event = await createDuration(actorId)
      return {
        ok: true,
        message: 'Created the duration event through WorldEventService.',
        activity: {
          action: request.action,
          actor: request.actor === 'MEMBER' ? 'Bodwick (Threadwalker)' : 'Sera (Threadwatcher)',
          target: WORLD_NAME,
          expected: request.actor === 'MEMBER' ? 'Duration event created' : 'WORLD_PERMISSION_DENIED',
          actual: `${event.startWorldDateLabel} — ${event.endWorldDateLabel}`,
          status: request.actor === 'MEMBER' ? 'passed' : 'failed',
        },
      }
    }

    await serviceFor('11300000-0000-4000-8000-000000000034').createEvent({
      actorUserId: MEMBER_ID,
      worldId: WORLD_ID,
      title: 'Impossible War',
      startDate: { year: '1300' },
      endDate: { year: '1299' },
    })
    return {
      ok: false,
      message: 'Invalid duration unexpectedly succeeded.',
    }
  },
  mapError(error, action) {
    if (error instanceof WorldDomainError) {
      const expectedViewerFailure =
        action &&
        typeof action === 'object' &&
        (action as { actor?: unknown }).actor === 'VIEWER'
      return {
        code: error.code,
        message: error.message,
        status: 403,
        activity: {
          action: (action as { action?: string } | undefined)?.action ?? 'unknown',
          actor: 'Sera (Threadwatcher)',
          target: WORLD_NAME,
          expected: 'WORLD_PERMISSION_DENIED',
          actual: error.code,
          domainErrorCode: error.code,
          status: expectedViewerFailure ? 'passed' : 'failed',
        },
      }
    }
    if (error instanceof WorldEventDomainError) {
      const expectedInvalid = error.code === 'WORLD_EVENT_END_BEFORE_START'
      return {
        code: error.code,
        message: error.message,
        status: 400,
        activity: {
          action: (action as { action?: string } | undefined)?.action ?? 'unknown',
          actor: 'Bodwick (Threadwalker)',
          target: WORLD_NAME,
          expected: 'WORLD_EVENT_END_BEFORE_START',
          actual: error.code,
          domainErrorCode: error.code,
          status: expectedInvalid ? 'passed' : 'failed',
        },
      }
    }
    if (error instanceof FixtureOwnershipError) {
      return { code: error.code, message: error.message, status: 409 }
    }
    return null
  },
}
