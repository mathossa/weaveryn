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
import { MAIN_WORLD_TIMELINE_NAME, WorldDomainError } from '@/server/worlds'
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
const CAMPAIGN_ID = '20000000-0000-4000-8000-000000000007'
const CAMPAIGN_OWNER_MEMBERSHIP_ID = '20000000-0000-4000-8000-000000000008'
const CAMPAIGN_PLAYER_MEMBERSHIP_ID = '20000000-0000-4000-8000-000000000009'
const OWNER_ID = '20000000-0000-4000-8000-00000000000a'
const MEMBER_ID = '20000000-0000-4000-8000-00000000000b'
const VIEWER_ID = '20000000-0000-4000-8000-00000000000c'
const CAMPAIGN_PLAYER_ID = '20000000-0000-4000-8000-00000000000d'
const LOCATION_ID = '20000000-0000-4000-8000-000000000010'
const ORGANIZATION_ID = '20000000-0000-4000-8000-000000000011'
const OTHER_WORLD_ENTITY_ID = '20000000-0000-4000-8000-000000000012'
const UNAUTHORIZED_ENTITY_ID = '20000000-0000-4000-8000-000000000013'
const CAMPAIGN_ENTITY_ID = '20000000-0000-4000-8000-000000000014'
const CAMPAIGN_ENTITY_TWO_ID = '20000000-0000-4000-8000-000000000015'
const GM_ENTITY_ID = '20000000-0000-4000-8000-000000000016'
const PLAYER_ENTITY_ID = '20000000-0000-4000-8000-000000000017'
const PRIVATE_ENTITY_ID = '20000000-0000-4000-8000-000000000018'
const CUSTOM_ENTITY_ID = '20000000-0000-4000-8000-000000000019'
const RELATIONSHIP_ID = '20000000-0000-4000-8000-000000000020'
const CROSS_WORLD_RELATIONSHIP_ID = '20000000-0000-4000-8000-000000000021'
const CAMPAIGN_RELATIONSHIP_ID = '20000000-0000-4000-8000-000000000022'
const PERSON_FALLBACK_ID = '20000000-0000-4000-8000-000000000023'
const ITEM_FALLBACK_ID = '20000000-0000-4000-8000-000000000024'
const EVENT_FALLBACK_ID = '20000000-0000-4000-8000-000000000025'
const DEITY_FALLBACK_ID = '20000000-0000-4000-8000-000000000026'
const CREATURE_FALLBACK_ID = '20000000-0000-4000-8000-000000000027'
const QUEST_FALLBACK_ID = '20000000-0000-4000-8000-000000000028'
const GENERIC_FALLBACK_ID = '20000000-0000-4000-8000-000000000029'

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
  {
    id: CAMPAIGN_PLAYER_ID,
    email: 'dev-world-entities-player@weaveryn.local',
    username: 'world-entities-player',
    displayName: 'Tarin (Campaign-only player)',
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
    const [worlds, entities, relationships, entityTypes] = await Promise.all([
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
          image: true,
          data: true,
          visibilityScope: true,
          visibilityCampaignId: true,
          visibilityUserId: true,
          createdById: true,
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
          visibilityScope: true,
        },
        orderBy: { id: 'asc' },
      }),
      transaction.worldEntityType.findMany({
        where: { worldId: PRIMARY_WORLD_ID },
        select: { id: true, worldId: true, campaignId: true, name: true },
        orderBy: { id: 'asc' },
      }),
    ])

    if (worlds.length === 0) return null
    if (worlds.length !== 2) {
      throw new FixtureOwnershipError(
        'World entity scenario fixture is only partially present.',
      )
    }
    return { worlds, entities, relationships, entityTypes }
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
        campaigns: {
          create: {
            id: CAMPAIGN_ID,
            name: 'Lanterns Below',
            ownerId: OWNER_ID,
            timelineId: PRIMARY_TIMELINE_ID,
            currentWorldPosition: '1',
            currentWorldDateLabel: 'Day 1',
            memberships: {
              create: [
                {
                  id: CAMPAIGN_OWNER_MEMBERSHIP_ID,
                  userId: OWNER_ID,
                  role: 'GM',
                },
                {
                  id: CAMPAIGN_PLAYER_MEMBERSHIP_ID,
                  userId: CAMPAIGN_PLAYER_ID,
                  role: 'PLAYER',
                },
              ],
            },
          },
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
  await serviceWithId(PERSON_FALLBACK_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'person',
    name: 'Mira Ashfall',
    data: { role: 'wayfinder' },
  })
  await serviceWithId(ITEM_FALLBACK_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'item',
    name: 'Glass Compass',
  })
  await serviceWithId(EVENT_FALLBACK_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'event',
    name: 'The Emberfall',
  })
  await serviceWithId(DEITY_FALLBACK_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'deity',
    name: 'The Listening Stone',
  })
  await serviceWithId(CREATURE_FALLBACK_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'creature',
    name: 'Mossback Stalker',
  })
  await serviceWithId(QUEST_FALLBACK_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'quest',
    name: 'Road to Hollow Spire',
  })
  await serviceWithId(GENERIC_FALLBACK_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'Thread Echo',
    name: 'Uncatalogued Resonance',
  })
  await serviceWithId(OTHER_WORLD_ENTITY_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: SECONDARY_WORLD_ID,
    type: 'location',
    name: 'Veyra Crossing',
    data: { concept: 'distant settlement' },
  })
}

async function createVisibilityEntities() {
  await serviceWithId(CAMPAIGN_ENTITY_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    contextCampaignId: CAMPAIGN_ID,
    type: 'location',
    name: 'Lantern Camp',
    data: { status: 'temporary' },
  })
  await serviceWithId(CAMPAIGN_ENTITY_TWO_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    contextCampaignId: CAMPAIGN_ID,
    type: 'item',
    name: 'Campaign Ledger',
  })
  await serviceWithId(GM_ENTITY_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'person',
    name: 'Hidden Patron',
    visibility: { scope: 'GM', campaignId: CAMPAIGN_ID },
  })
  await serviceWithId(PLAYER_ENTITY_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'item',
    name: 'Tarin Clue',
    visibility: {
      scope: 'PLAYER',
      campaignId: CAMPAIGN_ID,
      userId: CAMPAIGN_PLAYER_ID,
    },
  })
  await serviceWithId(PRIVATE_ENTITY_ID).createEntity({
    actorUserId: MEMBER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'person',
    name: 'Marek Private Draft',
    visibility: { scope: 'PRIVATE' },
  })
  await serviceWithId(CUSTOM_ENTITY_ID).createEntity({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    type: 'Astral Beacon',
    name: 'North Beacon',
    image: '/images/entities/Generic-03.webp',
    data: { active: true, height: 82 },
  })
  await serviceWithId(CAMPAIGN_RELATIONSHIP_ID).createRelationship({
    actorUserId: OWNER_ID,
    worldId: PRIMARY_WORLD_ID,
    contextCampaignId: CAMPAIGN_ID,
    sourceEntityId: CAMPAIGN_ENTITY_ID,
    targetEntityId: CAMPAIGN_ENTITY_TWO_ID,
    relationshipType: 'STORES',
    label: 'Kept at camp',
  })
  await prisma.campaign.update({
    where: { id: CAMPAIGN_ID },
    data: { currentLocationId: CAMPAIGN_ENTITY_ID },
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
    status: state?.entities.length === 10 ? 'passed' : 'failed',
    actor: 'Elara and Marek',
    target: 'Nine Aldorath fallback examples and one Veyra control entity',
    expected: '10 persisted ruleset-agnostic entities',
    actual: `${state?.entities.length ?? 0} entities`,
    detail:
      'The fixture includes no-image Person, Location, Organization, Item, Event, Deity, Creature, Quest, and unknown custom types while keeping runtime types data-driven.',
  })

  await createVisibilityEntities()
  state = await readState()
  const campaignPlayerEntities =
    await worldEntityServiceForScenario().listEntities(
      PRIMARY_WORLD_ID,
      CAMPAIGN_PLAYER_ID,
    )
  const viewerEntities = await worldEntityServiceForScenario().listEntities(
    PRIMARY_WORLD_ID,
    VIEWER_ID,
  )
  const campaignPlayerRelationships =
    await worldEntityServiceForScenario().listRelationships(
      PRIMARY_WORLD_ID,
      CAMPAIGN_PLAYER_ID,
    )
  checks.push({
    id: 'visibility',
    title: 'MVP visibility filters Campaign-only World access',
    status:
      campaignPlayerEntities
        .map((entity) => entity.name)
        .sort()
        .join('|') ===
        ['Campaign Ledger', 'Lantern Camp', 'Tarin Clue'].sort().join('|') &&
      viewerEntities.every((entity) => entity.visibilityScope === 'WORLD') &&
      campaignPlayerRelationships.some(
        (relationship) => relationship.id === CAMPAIGN_RELATIONSHIP_ID,
      )
        ? 'passed'
        : 'failed',
    actor: 'Tarin (Campaign-only PLAYER) and Vela (World VIEWER)',
    target: 'WORLD, CAMPAIGN, GM, PLAYER, PRIVATE entities and relationships',
    expected:
      'Tarin sees Campaign + targeted PLAYER content but not WORLD/GM/PRIVATE; Vela sees only WORLD content',
    actual: `Tarin: ${campaignPlayerEntities.map((entity) => entity.name).join(', ')}; Vela: ${viewerEntities.map((entity) => entity.name).join(', ')}`,
    detail:
      'Campaign membership grants only visibility-scoped World content and does not create WorldMembership or general edit permission.',
  })
  checks.push({
    id: 'custom-type',
    title: 'Free-text entity types become reusable',
    status: state?.entityTypes.some(
      (entityType) => entityType.name === 'Astral Beacon',
    )
      ? 'passed'
      : 'failed',
    actor: 'Elara (World owner)',
    target: 'Astral Beacon custom type',
    expected: 'Reusable World-scoped type suggestion',
    actual:
      state?.entityTypes.map((entityType) => entityType.name).join(', ') ||
      'no custom types',
    detail:
      'Custom types are persisted as reusable suggestions without turning WorldEntity.type into a fixed enum.',
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
      'Normal product input exposes simple structured fields rather than raw JSON; the application service still preserves generic structured data.',
  })

  await linkEntities()
  state = await readState()
  const worldRelationship = state?.relationships.find(
    (relationship) => relationship.id === RELATIONSHIP_ID,
  )
  checks.push({
    id: 'relationship',
    title: 'Same-World entities can be linked explicitly',
    status:
      worldRelationship?.relationshipType === 'HOSTS' ? 'passed' : 'failed',
    actor: 'Marek (World member)',
    target: 'Moonwatch → Lantern Guild',
    expected: 'WORLD-visible HOSTS relationship',
    actual: worldRelationship?.relationshipType ?? 'missing',
    detail:
      'The relationship is a first-class directed record with its own server-enforced visibility.',
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
      !state?.relationships.some(
        (relationship) => relationship.id === RELATIONSHIP_ID,
      ) &&
      primaryEntities.some((entity) => entity.id === LOCATION_ID) &&
      primaryEntities.some((entity) => entity.id === ORGANIZATION_ID)
        ? 'passed'
        : 'failed',
    actor: 'Marek (World member)',
    target: 'HOSTS relationship',
    expected: 'HOSTS link removed and both entities retained',
    actual: `${state?.relationships.length ?? 0} remaining relationships; ${primaryEntities.length} Aldorath entities`,
    detail:
      'Relationship deletion removes only the link record; entity deletion has a separate confirmed product workflow.',
  })

  let crossWorldCode: string | null = null
  try {
    await tryCrossWorldRelationship()
  } catch (error) {
    crossWorldCode = error instanceof WorldEntityDomainError ? error.code : null
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

function worldEntityServiceForScenario() {
  return new WorldEntityService(new PrismaWorldEntityRepository(prisma))
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
      const secondary = await cleanupWorldFixture(transaction, secondaryFixture)
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
      message: 'Executed World entity, visibility, and relationship checks.',
      checks,
    }
  },
  isAction: isWorldEntitiesScenarioAction,
  async execute(action) {
    if (action.action === 'create-entities') await createEntities()
    else if (action.action === 'create-visibility-entities') {
      await createVisibilityEntities()
    } else if (action.action === 'update-entity') await updateEntity()
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
              : action.action === 'create-visibility-entities'
                ? 'Elara, Marek, Tarin'
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
