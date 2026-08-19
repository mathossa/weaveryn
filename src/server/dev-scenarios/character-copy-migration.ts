import { randomUUID } from 'node:crypto'
import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  DevAcceptanceCheck,
  DevScenario,
  DevScenarioActionResult,
} from '@/dev/scenario-contracts'
import {
  isCharacterCopyMigrationAction,
  type CharacterCopyMigrationAction,
  type CharacterCopyMigrationState,
} from '@/dev/scenarios/character-copy-migration'
import { prisma } from '@/lib/prisma'
import {
  CharacterDomainError,
  CharacterService,
  PrismaCharacterRepository,
} from '@/server/characters'
import {
  CampaignCharacterService,
  PrismaCampaignCharacterRepository,
} from '@/server/campaign-characters'
import { FixtureOwnershipError } from './fixture-safety'

const metadata = requireDevScenarioMetadata('character-copy-migration')
const OWNER_ID = '19000000-0000-4000-8000-0000000000a1'
const WORLD_ONE_ID = '19000000-0000-4000-8000-0000000000b1'
const WORLD_TWO_ID = '19000000-0000-4000-8000-0000000000b2'
const WORLD_THREE_ID = '19000000-0000-4000-8000-0000000000b3'
const TIMELINE_ID = '19000000-0000-4000-8000-0000000000c1'
const CAMPAIGN_ID = '19000000-0000-4000-8000-0000000000d1'
const CHARACTER_ID = '19000000-0000-4000-8000-0000000000e1'
const SOURCE_ID = '19000000-0000-4000-8000-0000000000e2'
const COPY_ID = '19000000-0000-4000-8000-0000000000e3'
const MOONBLADE_ID = '19000000-0000-4000-8000-0000000000e4'
const PARTICIPATION_ID = '19000000-0000-4000-8000-0000000000f1'
const RELATIONSHIP_ID = '19000000-0000-4000-8000-0000000000f2'

const characters = (id = randomUUID()) =>
  new CharacterService(new PrismaCharacterRepository(prisma), () => id)
const campaignCharacters = () =>
  new CampaignCharacterService(new PrismaCampaignCharacterRepository(prisma))

async function assertOwned() {
  const [worlds, character, campaign, entities] = await Promise.all([
    prisma.world.findMany({
      where: { id: { in: [WORLD_ONE_ID, WORLD_TWO_ID, WORLD_THREE_ID] } },
      select: { id: true, description: true, ownerId: true },
    }),
    prisma.character.findUnique({
      where: { id: CHARACTER_ID },
      select: { ownerUserId: true, coreData: true },
    }),
    prisma.campaign.findUnique({
      where: { id: CAMPAIGN_ID },
      select: { description: true, ownerId: true, worldId: true },
    }),
    prisma.worldEntity.findMany({
      where: { id: { in: [SOURCE_ID, COPY_ID, MOONBLADE_ID] } },
      select: {
        id: true,
        worldId: true,
        worldCharacterId: true,
        createdById: true,
        description: true,
      },
    }),
  ])

  for (const world of worlds) {
    if (
      world.description !== metadata.fixtureNamespace ||
      world.ownerId !== OWNER_ID
    ) {
      throw new FixtureOwnershipError(
        `World ${world.id} is not scenario-owned.`,
      )
    }
  }

  if (
    character &&
    (character.ownerUserId !== OWNER_ID ||
      (character.coreData as { marker?: string } | null)?.marker !==
        metadata.fixtureNamespace)
  ) {
    throw new FixtureOwnershipError('Character fixture is not scenario-owned.')
  }

  if (
    campaign &&
    (campaign.description !== metadata.fixtureNamespace ||
      campaign.ownerId !== OWNER_ID ||
      campaign.worldId !== WORLD_ONE_ID)
  ) {
    throw new FixtureOwnershipError('Campaign fixture is not scenario-owned.')
  }

  for (const entity of entities) {
    const isServiceCreatedCopy =
      entity.id === COPY_ID &&
      entity.worldId === WORLD_TWO_ID &&
      entity.worldCharacterId === COPY_ID &&
      entity.createdById === OWNER_ID
    const isMarkedFixtureEntity =
      entity.description === metadata.fixtureNamespace &&
      [WORLD_ONE_ID, WORLD_TWO_ID, WORLD_THREE_ID].includes(entity.worldId)

    if (!isServiceCreatedCopy && !isMarkedFixtureEntity) {
      throw new FixtureOwnershipError(
        `WorldEntity ${entity.id} is not scenario-owned.`,
      )
    }
  }
}

async function readState(): Promise<CharacterCopyMigrationState | null> {
  await assertOwned()
  const character = await prisma.character.findUnique({
    where: { id: CHARACTER_ID },
    select: { id: true, ownerUserId: true, name: true },
  })
  if (!character) return null

  const [worlds, worldCharacters, participations, entities, relationships] =
    await Promise.all([
      prisma.world.findMany({
        where: { id: { in: [WORLD_ONE_ID, WORLD_TWO_ID, WORLD_THREE_ID] } },
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      }),
      prisma.worldCharacter.findMany({
        where: { characterId: CHARACTER_ID },
        select: { id: true, worldId: true, nameOverride: true, worldData: true },
        orderBy: { id: 'asc' },
      }),
      prisma.campaignCharacter.findMany({
        where: { worldCharacter: { characterId: CHARACTER_ID } },
        select: { id: true, worldCharacterId: true, campaignId: true },
        orderBy: { id: 'asc' },
      }),
      prisma.worldEntity.findMany({
        where: {
          worldId: { in: [WORLD_ONE_ID, WORLD_TWO_ID, WORLD_THREE_ID] },
        },
        select: {
          id: true,
          worldId: true,
          worldCharacterId: true,
          type: true,
          name: true,
        },
        orderBy: { id: 'asc' },
      }),
      prisma.entityRelationship.findMany({
        where: {
          worldId: { in: [WORLD_ONE_ID, WORLD_TWO_ID, WORLD_THREE_ID] },
        },
        select: {
          id: true,
          worldId: true,
          sourceEntityId: true,
          targetEntityId: true,
          relationshipType: true,
        },
        orderBy: { id: 'asc' },
      }),
    ])

  return {
    character,
    worlds,
    worldCharacters,
    participations,
    entities,
    relationships,
  }
}

async function resetFixture() {
  await prisma.$transaction(async (tx) => {
    await assertOwned()
    await tx.campaignCharacter.deleteMany({
      where: { worldCharacter: { characterId: CHARACTER_ID } },
    })
    await tx.campaign.deleteMany({
      where: { id: CAMPAIGN_ID, description: metadata.fixtureNamespace },
    })
    await tx.worldCharacter.deleteMany({ where: { characterId: CHARACTER_ID } })
    await tx.character.deleteMany({
      where: { id: CHARACTER_ID, ownerUserId: OWNER_ID },
    })
    await tx.world.deleteMany({
      where: {
        id: { in: [WORLD_ONE_ID, WORLD_TWO_ID, WORLD_THREE_ID] },
        description: metadata.fixtureNamespace,
      },
    })

    await tx.user.upsert({
      where: { id: OWNER_ID },
      create: {
        id: OWNER_ID,
        email: 'dev-issue19-owner@weaveryn.local',
        username: 'issue19-owner',
        displayName: 'Character owner and World admin',
      },
      update: {
        email: 'dev-issue19-owner@weaveryn.local',
        username: 'issue19-owner',
        displayName: 'Character owner and World admin',
      },
    })
    await tx.world.createMany({
      data: [
        {
          id: WORLD_ONE_ID,
          ownerId: OWNER_ID,
          name: 'Issue 19 Aldorath',
          description: metadata.fixtureNamespace,
        },
        {
          id: WORLD_TWO_ID,
          ownerId: OWNER_ID,
          name: 'Issue 19 Veyra',
          description: metadata.fixtureNamespace,
        },
        {
          id: WORLD_THREE_ID,
          ownerId: OWNER_ID,
          name: 'Issue 19 Nareth',
          description: metadata.fixtureNamespace,
        },
      ],
    })
    await tx.worldTimeline.create({
      data: { id: TIMELINE_ID, worldId: WORLD_ONE_ID, name: 'Main' },
    })
    await tx.campaign.create({
      data: {
        id: CAMPAIGN_ID,
        name: 'Issue 19 Aldorath Campaign',
        description: metadata.fixtureNamespace,
        worldId: WORLD_ONE_ID,
        ownerId: OWNER_ID,
        timelineId: TIMELINE_ID,
        currentWorldPosition: 1,
        currentWorldDateLabel: 'Day 1',
      },
    })
    await tx.campaignMembership.create({
      data: { campaignId: CAMPAIGN_ID, userId: OWNER_ID, role: 'GM' },
    })
    await tx.character.create({
      data: {
        id: CHARACTER_ID,
        ownerUserId: OWNER_ID,
        name: 'Bodwick',
        image: '/images/characters/default-character.webp',
        coreData: { marker: metadata.fixtureNamespace },
      },
    })
    await tx.worldCharacter.create({
      data: {
        id: SOURCE_ID,
        characterId: CHARACTER_ID,
        worldId: WORLD_ONE_ID,
        nameOverride: 'Bodwick of Aldorath',
        worldData: { culture: 'Aldoran', marker: metadata.fixtureNamespace },
      },
    })
    await tx.worldEntity.createMany({
      data: [
        {
          id: SOURCE_ID,
          worldId: WORLD_ONE_ID,
          worldCharacterId: SOURCE_ID,
          type: 'character',
          name: 'Bodwick of Aldorath',
          image: '/images/characters/default-character.webp',
          description: metadata.fixtureNamespace,
          data: { marker: metadata.fixtureNamespace },
          createdById: OWNER_ID,
          visibilityScope: 'WORLD',
        },
        {
          id: MOONBLADE_ID,
          worldId: WORLD_ONE_ID,
          type: 'item',
          name: 'Moonblade',
          description: metadata.fixtureNamespace,
          data: { marker: metadata.fixtureNamespace },
          createdById: OWNER_ID,
          visibilityScope: 'WORLD',
        },
      ],
    })
    await tx.entityRelationship.create({
      data: {
        id: RELATIONSHIP_ID,
        worldId: WORLD_ONE_ID,
        sourceEntityId: SOURCE_ID,
        targetEntityId: MOONBLADE_ID,
        relationshipType: 'OWNS',
        metadata: { marker: metadata.fixtureNamespace },
        createdById: OWNER_ID,
        visibilityScope: 'WORLD',
      },
    })
    await tx.campaignCharacter.create({
      data: {
        id: PARTICIPATION_ID,
        worldCharacterId: SOURCE_ID,
        campaignId: CAMPAIGN_ID,
        sheetData: { level: 3 },
      },
    })
  })
}

function result(
  action: string,
  actual: string,
  ok: boolean,
  code?: string,
): DevScenarioActionResult {
  return {
    ok,
    message: actual,
    activity: {
      action,
      actor: 'Character owner and World admin',
      target: 'Issue #19/#117 fixture',
      expected: 'Registered service behavior',
      actual,
      status: ok ? 'passed' : 'failed',
      domainErrorCode: code,
    },
  }
}

async function execute(
  action: CharacterCopyMigrationAction,
): Promise<DevScenarioActionResult> {
  if (!(await readState())) {
    return result(
      action.action,
      'Reset the deterministic fixture first.',
      false,
    )
  }

  try {
    if (action.action === 'copy') {
      await characters(COPY_ID).copyWorldCharacter({
        actorUserId: OWNER_ID,
        sourceWorldCharacterId: SOURCE_ID,
        targetWorldId: WORLD_TWO_ID,
        nameOverride: 'Bodwick of Veyra',
        worldData: { culture: 'Veyran' },
      })
      return result(
        action.action,
        'Copied with a fresh Character entity in Veyra; Campaign participation and Aldorath relationships were not copied.',
        true,
      )
    }

    if (action.action === 'try-duplicate-copy') {
      await characters().copyWorldCharacter({
        actorUserId: OWNER_ID,
        sourceWorldCharacterId: SOURCE_ID,
        targetWorldId: WORLD_TWO_ID,
      })
      return result(action.action, 'Unexpectedly created duplicate.', false)
    }

    if (action.action === 'try-migrate-with-participation') {
      await characters().migrateWorldCharacter({
        actorUserId: OWNER_ID,
        worldCharacterId: SOURCE_ID,
        targetWorldId: WORLD_THREE_ID,
      })
      return result(
        action.action,
        'Unexpectedly migrated a participating incarnation.',
        false,
      )
    }

    if (action.action === 'resolve-participation') {
      await campaignCharacters().removeCampaignCharacter(
        PARTICIPATION_ID,
        OWNER_ID,
      )
      return result(
        action.action,
        'Removed Campaign participation through CampaignCharacterService.',
        true,
      )
    }

    await characters().migrateWorldCharacter({
      actorUserId: OWNER_ID,
      worldCharacterId: SOURCE_ID,
      targetWorldId: WORLD_THREE_ID,
      worldData: { culture: 'Narethian' },
    })
    return result(
      action.action,
      'Migrated the same WorldCharacter to Nareth; the Aldorath entity remained as an NPC with its relationships.',
      true,
    )
  } catch (error) {
    if (
      error instanceof CharacterDomainError &&
      ((action.action === 'try-duplicate-copy' &&
        error.code === 'WORLD_CHARACTER_ALREADY_EXISTS') ||
        (action.action === 'try-migrate-with-participation' &&
          error.code === 'WORLD_CHARACTER_HAS_CAMPAIGN_PARTICIPATION'))
    ) {
      return result(
        action.action,
        `Rejected with ${error.code}.`,
        true,
        error.code,
      )
    }
    throw error
  }
}

async function runAll(): Promise<DevScenarioActionResult> {
  await resetFixture()
  const checks: DevAcceptanceCheck[] = []

  const copy = await execute({ action: 'copy' })
  const afterCopy = await readState()
  checks.push({
    id: 'copy',
    title: 'Copy creates a separate Character entity without World relationships',
    status:
      copy.ok &&
      afterCopy?.entities.some(
        (entity) =>
          entity.worldId === WORLD_TWO_ID &&
          entity.worldCharacterId === COPY_ID &&
          entity.type === 'character',
      ) &&
      !afterCopy.relationships.some((relationship) =>
        afterCopy.entities.some(
          (entity) =>
            entity.worldId === WORLD_TWO_ID &&
            (relationship.sourceEntityId === entity.id ||
              relationship.targetEntityId === entity.id),
        ),
      )
        ? 'passed'
        : 'failed',
    detail: copy.message,
  })

  const duplicate = await execute({ action: 'try-duplicate-copy' })
  checks.push({
    id: 'duplicate',
    title: 'Duplicate target incarnation is rejected',
    status: duplicate.ok ? 'passed' : 'failed',
    detail: duplicate.message,
    domainErrorCode: duplicate.activity?.domainErrorCode,
  })

  const blocked = await execute({ action: 'try-migrate-with-participation' })
  checks.push({
    id: 'blocked-migration',
    title: 'Campaign participation blocks migration without graph changes',
    status:
      blocked.ok &&
      (await readState())?.worldCharacters.some(
        (wc) => wc.id === SOURCE_ID && wc.worldId === WORLD_ONE_ID,
      )
        ? 'passed'
        : 'failed',
    detail: blocked.message,
    domainErrorCode: blocked.activity?.domainErrorCode,
  })

  await execute({ action: 'resolve-participation' })
  const migration = await execute({ action: 'migrate' })
  const after = await readState()
  const sourceNpc = after?.entities.find((entity) => entity.id === SOURCE_ID)
  const targetCharacterEntity = after?.entities.find(
    (entity) =>
      entity.worldId === WORLD_THREE_ID &&
      entity.worldCharacterId === SOURCE_ID &&
      entity.type === 'character',
  )
  const preservedRelationship = after?.relationships.find(
    (relationship) => relationship.id === RELATIONSHIP_ID,
  )

  checks.push({
    id: 'safe-migration',
    title: 'Migration preserves portable and WorldCharacter identity',
    status:
      migration.ok &&
      after?.character?.ownerUserId === OWNER_ID &&
      after.worldCharacters.some(
        (wc) => wc.id === SOURCE_ID && wc.worldId === WORLD_THREE_ID,
      ) &&
      after.participations.length === 0
        ? 'passed'
        : 'failed',
    detail: migration.message,
  })
  checks.push({
    id: 'source-graph-continuity',
    title: 'Source Character entity becomes an NPC and keeps its relationships',
    status:
      sourceNpc?.worldId === WORLD_ONE_ID &&
      sourceNpc.worldCharacterId === null &&
      sourceNpc.type === 'person' &&
      sourceNpc.name === 'Bodwick of Aldorath' &&
      preservedRelationship?.sourceEntityId === SOURCE_ID &&
      preservedRelationship.targetEntityId === MOONBLADE_ID
        ? 'passed'
        : 'failed',
    detail:
      'The Aldorath graph keeps Bodwick as a Person / NPC snapshot still connected to Moonblade.',
  })
  checks.push({
    id: 'target-graph-identity',
    title: 'Target World gets one fresh Character-backed entity',
    status: targetCharacterEntity ? 'passed' : 'failed',
    detail:
      'Nareth contains the migrated WorldCharacter as a fresh Character entity without copying Aldorath relationships.',
  })

  return {
    ok: checks.every((check) => check.status === 'passed'),
    message: 'Executed Issue #19/#117 copy, migration, and graph checks.',
    checks,
  }
}

async function cleanup(): Promise<DevScenarioActionResult> {
  await resetFixture()
  await prisma.$transaction(async (tx) => {
    await tx.campaignCharacter.deleteMany({
      where: { worldCharacter: { characterId: CHARACTER_ID } },
    })
    await tx.campaign.deleteMany({
      where: { id: CAMPAIGN_ID, description: metadata.fixtureNamespace },
    })
    await tx.worldCharacter.deleteMany({ where: { characterId: CHARACTER_ID } })
    await tx.character.deleteMany({
      where: { id: CHARACTER_ID, ownerUserId: OWNER_ID },
    })
    await tx.world.deleteMany({
      where: {
        id: { in: [WORLD_ONE_ID, WORLD_TWO_ID, WORLD_THREE_ID] },
        description: metadata.fixtureNamespace,
      },
    })
  })

  return {
    ok: true,
    message: 'Removed only Issue #19/#117 scenario records.',
    cleanup: {
      deleted: [
        'Scenario Worlds, Campaign, Character, WorldCharacters, graph entities, relationships, and participation',
      ],
      retained: ['Fixture user retained'],
    },
  }
}

export const characterCopyMigrationScenario: DevScenario<
  CharacterCopyMigrationState,
  CharacterCopyMigrationAction
> = {
  metadata,
  readState,
  reset: async () => {
    await resetFixture()
    return { ok: true, message: 'Reset Issue #19/#117 fixture.' }
  },
  cleanup,
  runAll,
  isAction: isCharacterCopyMigrationAction,
  execute,
}
