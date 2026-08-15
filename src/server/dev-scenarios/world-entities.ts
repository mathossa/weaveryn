import type { Prisma } from '@/generated/prisma/client'
import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type { DevAcceptanceCheck, DevScenario } from '@/dev/scenario-contracts'
import {
  isWorldEntitiesScenarioAction,
  type WorldEntitiesScenarioAction,
  type WorldEntitiesScenarioState,
} from '@/dev/scenarios/world-entities'
import { prisma } from '@/lib/prisma'
import {
  PrismaWorldEntityRepository,
  WorldEntityDomainError,
  WorldEntityService,
} from '@/server/world-entities'
import {
  MAIN_WORLD_TIMELINE_NAME,
  WorldDomainError,
} from '@/server/worlds'
import { FixtureOwnershipError } from './fixture-safety'
import {
  assertWorldFixtureOwned,
  cleanupWorldFixture,
  upsertFixturePeople,
  type WorldFixtureDefinition,
} from './world-fixture'

const metadata = requireDevScenarioMetadata('world-entities')
const PRIMARY_WORLD_ID = '20000000-0000-4000-8000-000000000001'
const SECONDARY_WORLD_ID = '20000000-0000-4000-8000-000000000002'
const PRIMARY_TIMELINE_ID = '20000000-0000-4000-8000-000000000003'
const SECONDARY_TIMELINE_ID = '20000000-0000-4000-8000-000000000004'
const MEMBER_MEMBERSHIP_ID = '20000000-0000-4000-8000-000000000005'
const VIEWER_MEMBERSHIP_ID = '20000000-0000-4000-8000-000000000006'
const OWNER_ID = '20000000-0000-4000-8000-00000000000a'
const MEMBER_ID = '20000000-0000-4000-8000-00000000000b'
const VIEWER_ID = '20000000-0000-4000-8000-00000000000c'
const LOCATION_ID = '20000000-0000-4000-8000-000000000010'
const ORGANIZATION_ID = '20000000-0000-4000-8000-000000000011'
const OTHER_WORLD_ENTITY_ID = '20000000-0000-4000-8000-000000000012'
const UNAUTHORIZED_ENTITY_ID = '20000000-0000-4000-8000-000000000013'
const RELATIONSHIP_ID = '20000000-0000-4000-8000-000000000020'
const CROSS_WORLD_RELATIONSHIP_ID = '20000000-0000-4000-8000-000000000021'

const people = [
  {
    id: OWNER_ID,
    email: 'dev-world-entities-owner@weaveryn.local',
    username: 'world-entities-owner',
    displayName: 'Elara (World owner)',
  },
  {
    id: MEMBER_ID,
    email: 'dev-world-entities-member@weaveryn.local',
    username: 'world-entities-member',
    displayName: 'Marek (World member)',
  },
  {
    id: VIEWER_ID,
    email: 'dev-world-entities-viewer@weaveryn.local',
    username: 'world-entities-viewer',
    displayName: 'Vela (World viewer)',
  },
] as const

const primaryFixture: WorldFixtureDefinition = {
  worldId: PRIMARY_WORLD_ID,
  worldMarker: `${metadata.fixtureNamespace}:primary`,
  people,
}

const secondaryFixture: WorldFixtureDefinition = {
  worldId: SECONDARY_WORLD_ID,
  worldMarker: `${metadata.fixtureNamespace}:secondary`,
  people: [],
}

function serviceWithId(id: string) {
  return new WorldEntityService(
    new PrismaWorldEntityRepository(prisma),
    () => id,
  )
}

async function assertFixturesOwned(transaction: Prisma.TransactionClient) {
  await assertWorldFixtureOwned(transaction, primaryFixture)
  await assertWorldFixtureOwned(transaction, secondaryFixture)
}

async function readState(): Promise<WorldEntitiesScenarioState | null> {
  return prisma.$transaction(async (transaction) => {
    await assertFixturesOwned(transaction)
    const [worlds, entities, relationships] = await Promise.all([
      transaction.world.findMany({
        where: { id: { in: [PRIMARY_WORLD_ID, SECONDARY_WORLD_ID] } },
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      }),
      transaction.worldEntity.findMany({
        where: {
          worldId: { in: [PRIMARY_WORLD_ID, SECONDARY_WORLD_ID] },
        },
        select: {
          id: true,
          worldId: true,
          type: true,
          name: true,
          data: true,
        },
        orderBy: { id: 'asc' },
      }),
      transaction.entityRelationship.findMany({
        where: { worldId: PRIMARY_WORLD_ID },
        select: {
          id: true,
          worldId: true,
          sourceEntityId: true,
          targetEntityId: true,
          relationshipType: true,
          label: true,
          metadata: true,
        },
        orderBy: { id: 'asc' },
      }),
    ])

    if (worlds.length === 0) return null
    if (worlds.length !== 2) {
      throw new FixtureOwnershipError(
        'World entity scenario fixture is only partially present.',
      )
    }
    return { worlds, entities, relationships }
  })
}

async function resetFixture() {
  await prisma.$transaction(async (transaction) => {
    await assertFixturesOwned(transaction)
    await transaction.world.deleteMany({
      where: {
        OR: [
          {
            id: PRIMARY_WORLD_ID,
            description: primaryFixture.worldMarker,
          },
          {
            id: SECONDARY_WORLD_ID,
            description: secondaryFixture.worldMarker,
          },
        ],
      },
    })
    await upsertFixturePeople(transaction, people)
    await transaction.world.create({
      data: {
        id: PRIMARY_WORLD_ID,
        name: 'Aldorath Entity Laboratory',
        description: primaryFixture.worldMarker,
        ownerId: OWNER_ID,
        timelines: {
          create: {
            id: PRIMARY_TIMELINE_ID,
            name: MAIN_WORLD_TIMELINE_NAME,
          },
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
      },
    })
    await transaction.world.create({
      data: {
        id: SECONDARY_WORLD_ID,
        name: 'Veyra Entity Laboratory',
        description: secondaryFixture.worldMarker,
        ownerId: OWNER_ID,
        timelines: {
          create: {
            id: SECONDARY_TIMELINE_ID,
            name: MAIN_WORLD_TIMELINE_NAME,
          },
        },
      },
    })
  })
}

async function createEntities() {
  await serviceWithId(LOCATION_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'location',
    name: 'Moonwatch',
    data: { population: 2400, concept: 'fortified settlement' },
  })
  await serviceWithId(ORGANIZATION_ID).createEntity({
    actorUserId: MEMBER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'organization',
    name: 'Lantern Guild',
    data: { focus: 'exploration' },
  })
  await serviceWithId(OTHER_WORLD_ENTITY_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: SECONDARY_WORLD_ID,
    type: 'location',
    name: 'Veyra Crossing',
    data: { concept: 'distant settlement' },
  })
}

async function updateEntity() {
  return serviceWithId('unused').updateEntity(
    PRIMARY_WORLD_ID,
    MEMBER_ID,
    LOCATION_ID,
    {
      name: 'Moonwatch Keep',
      data: { population: 2500, concept: 'fortified settlement' },
    },
  )
}

async function linkEntities() {
  return serviceWithId(RELATIONSHIP_ID).createRelationship({
    actorUserId: MEMBER_ID,
    worldId: PRIMARY_WORLD_ID,
    sourceEntityId: LOCATION_ID,
    targetEntityId: ORGANIZATION_ID,
    relationshipType: 'HOSTS',
    label: 'Guild headquarters',
    metadata: { since: 812 },
  })
}

async function deleteRelationship() {
  return serviceWithId('unused').deleteRelationship(
    PRIMARY_WORLD_ID,
    MEMBER_ID,
    RELATIONSHIP_ID,
  )
}

async function tryCrossWorldRelationship() {
  return serviceWithId(CROSS_WORLD_RELATIONSHIP_ID).createRelationship({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    sourceEntityId: LOCATION_ID,
    targetEntityId: OTHER_WORLD_ENTITY_ID,
    relationshipType: 'CONNECTED_TO',
  })
}

async function tryUnauthorizedCreate() {
  return serviceWithId(UNAUTHORIZED_ENTITY_ID).createEntity({
    actorUserId: VIEWER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'note',
    name: 'Viewer edit that must fail',
  })
}

async function runAll() {
  await resetFixture()
  const checks: DevAcceptanceCheck[] = []

  await createEntities()
  let state = await readState()
  checks.push({
    id: 'create',
    title: 'World entities are created through the real service',
    status: state?.entities.length === 3 ? 'passed' : 'failed',
    actor: 'Elara and Marek',
    target: 'Two Aldorath entities and one Veyra entity',
    expected: '3 persisted ruleset-agnostic entities',
    actual: `${state?.entities.length ?? 0} entities`,
    detail:
      'Owner and MEMBER both use World EDIT_CONTENT authorization; entity types and structured data remain generic.',
  })

  await updateEntity()
  state = await readState()
  const updated = state?.entities.find((entity) => entity.id === LOCATION_ID)
  checks.push({
    id: 'update',
    title: 'World entity structured data can be edited',
    status:
      updated?.name === 'Moonwatch Keep' &&
      JSON.stringify(updated.data).includes('2500')
        ? 'passed'
        : 'failed',
    actor: 'Marek (World member)',
    target: 'Moonwatch',
    expected: 'Moonwatch Keep with updated structured data',
    actual: updated
      ? `${updated.name} ${JSON.stringify(updated.data)}`
      : 'missing',
    detail:
      'The service only accepts explicit editable fields; World placement and creator attribution are not update inputs.',
  })

  await linkEntities()
  state = await readState()
  checks.push({
    id: 'relationship',
    title: 'Same-World entities can be linked explicitly',
    status:
      state?.relationships.length === 1 &&
      state.relationships[0]?.relationshipType === 'HOSTS'
        ? 'passed'
        : 'failed',
    actor: 'Marek (World member)',
    target: 'Moonwatch → Lantern Guild',
    expected: 'HOSTS relationship',
    actual: state?.relationships[0]?.relationshipType ?? 'missing',
    detail:
      'The relationship is a first-class record rather than an ID hidden inside entity JSON.',
  })

  await deleteRelationship()
  state = await readState()
  const primaryEntities =
    state?.entities.filter((entity) => entity.worldId === PRIMARY_WORLD_ID) ??
    []
  checks.push({
    id: 'relationship-delete',
    title: 'Deleting a relationship preserves both linked entities',
    status:
      state?.relationships.length === 0 && primaryEntities.length === 2
        ? 'passed'
        : 'failed',
    actor: 'Marek (World member)',
    target: 'HOSTS relationship',
    expected: '0 relationships and both Aldorath entities retained',
    actual: `${state?.relationships.length ?? 0} relationships; ${primaryEntities.length} entities`,
    detail:
      'Relationship deletion removes only the link record; entity deletion has separate lifecycle behavior.',
  })

  let crossWorldCode: string | null = null
  try {
    await tryCrossWorldRelationship()
  } catch (error) {
    crossWorldCode =
      error instanceof WorldEntityDomainError ? error.code : null
  }
  checks.push({
    id: 'cross-world',
    title: 'Cross-World relationships are rejected',
    status:
      crossWorldCode === 'ENTITY_RELATIONSHIP_CROSS_WORLD'
        ? 'passed'
        : 'failed',
    actor: 'Elara (World owner)',
    target: 'Moonwatch → Veyra Crossing',
    expected: 'ENTITY_RELATIONSHIP_CROSS_WORLD',
    actual: crossWorldCode ?? 'no domain error',
    domainErrorCode: crossWorldCode,
    detail:
      'Both source and target must belong to the World supplied to the relationship operation.',
  })

  let unauthorizedCode: string | null = null
  try {
    await tryUnauthorizedCreate()
  } catch (error) {
    unauthorizedCode = error instanceof WorldDomainError ? error.code : null
  }
  checks.push({
    id: 'authorization',
    title: 'VIEWER cannot mutate World entity content',
    status:
      unauthorizedCode === 'WORLD_PERMISSION_DENIED' ? 'passed' : 'failed',
    actor: 'Vela (World viewer)',
    target: 'New World entity',
    expected: 'WORLD_PERMISSION_DENIED',
    actual: unauthorizedCode ?? 'no domain error',
    domainErrorCode: unauthorizedCode,
    detail: 'World authorization remains backend-enforced and fail-closed.',
  })

  return checks
}

export const worldEntitiesScenario: DevScenario<
  WorldEntitiesScenarioState,
  WorldEntitiesScenarioAction
> = {
  metadata,
  readState,
  async reset() {
    await resetFixture()
    return {
      ok: true,
      message: 'Created deterministic World entity fixtures.',
    }
  },
  async cleanup() {
    const cleanup = await prisma.$transaction(async (transaction) => {
      const secondary = await cleanupWorldFixture(
        transaction,
        secondaryFixture,
      )
      const primary = await cleanupWorldFixture(transaction, primaryFixture)
      return {
        deleted: [...secondary.deleted, ...primary.deleted],
        retained: [...secondary.retained, ...primary.retained],
      }
    })
    return {
      ok: true,
      message: 'Removed only the World entity scenario fixtures.',
      cleanup,
    }
  },
  async runAll() {
    const checks = await runAll()
    return {
      ok: checks.every((check) => check.status === 'passed'),
      message: 'Executed World entity and relationship acceptance checks.',
      checks,
    }
  },
  isAction: isWorldEntitiesScenarioAction,
  async execute(action) {
    if (action.action === 'create-entities') await createEntities()
    else if (action.action === 'update-entity') await updateEntity()
    else if (action.action === 'link-entities') await linkEntities()
    else if (action.action === 'delete-relationship') {
      await deleteRelationship()
    } else if (action.action === 'cross-world-link') {
      await tryCrossWorldRelationship()
    } else {
      await tryUnauthorizedCreate()
    }

    return {
      ok: true,
      message: 'World entity action completed through WorldEntityService.',
      activity: {
        action: action.action,
        actor:
          action.action === 'unauthorized-create'
            ? 'Vela (World viewer)'
            : action.action === 'cross-world-link'
              ? 'Elara (World owner)'
              : 'Registered scenario actor',
        target: 'World entity graph',
        expected: 'Registered service behavior',
        actual: 'Action completed',
        status: 'passed',
      },
    }
  },
  mapError(error, action) {
    if (
      !(error instanceof WorldEntityDomainError) &&
      !(error instanceof WorldDomainError)
    ) {
      return null
    }

    return {
      code: error.code,
      message: error.message,
      status: error.code === 'WORLD_PERMISSION_DENIED' ? 403 : 409,
      activity: {
        action:
          action && typeof action === 'object' && 'action' in action
            ? String(action.action)
            : 'World entity action',
        actor: 'Registered scenario actor',
        target: 'World entity graph',
        expected:
          action &&
          typeof action === 'object' &&
          'action' in action &&
          action.action === 'cross-world-link'
            ? 'ENTITY_RELATIONSHIP_CROSS_WORLD'
            : action &&
                typeof action === 'object' &&
                'action' in action &&
                action.action === 'unauthorized-create'
              ? 'WORLD_PERMISSION_DENIED'
              : 'Registered service behavior',
        actual: error.message,
        status: 'failed',
        domainErrorCode: error.code,
      },
    }
  },
}
