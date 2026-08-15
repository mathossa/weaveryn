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
const PARTICIPATION_ID = '19000000-0000-4000-8000-0000000000f1'

const characters = (id = randomUUID()) =>
  new CharacterService(new PrismaCharacterRepository(prisma), () => id)
const campaignCharacters = () =>
  new CampaignCharacterService(new PrismaCampaignCharacterRepository(prisma))

async function assertOwned() {
  const [worlds, character, campaign] = await Promise.all([
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
  ])
  for (const world of worlds) {
    if (
      world.description !== metadata.fixtureNamespace ||
      world.ownerId !== OWNER_ID
    )
      throw new FixtureOwnershipError(
        `World ${world.id} is not scenario-owned.`,
      )
  }
  if (
    character &&
    (character.ownerUserId !== OWNER_ID ||
      (character.coreData as { marker?: string } | null)?.marker !==
        metadata.fixtureNamespace)
  )
    throw new FixtureOwnershipError('Character fixture is not scenario-owned.')
  if (
    campaign &&
    (campaign.description !== metadata.fixtureNamespace ||
      campaign.ownerId !== OWNER_ID ||
      campaign.worldId !== WORLD_ONE_ID)
  )
    throw new FixtureOwnershipError('Campaign fixture is not scenario-owned.')
}

async function readState(): Promise<CharacterCopyMigrationState | null> {
  await assertOwned()
  const character = await prisma.character.findUnique({
    where: { id: CHARACTER_ID },
    select: { id: true, ownerUserId: true, name: true },
  })
  if (!character) return null
  const [worlds, worldCharacters, participations] = await Promise.all([
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
  ])
  return { character, worlds, worldCharacters, participations }
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
      target: 'Issue #19 fixture',
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
  if (!(await readState()))
    return result(
      action.action,
      'Reset the deterministic fixture first.',
      false,
    )
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
        'Copied with explicit Veyran data; Campaign participation was not copied.',
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
      'Migrated the same WorldCharacter to Nareth after participation was resolved.',
      true,
    )
  } catch (error) {
    if (
      error instanceof CharacterDomainError &&
      ((action.action === 'try-duplicate-copy' &&
        error.code === 'WORLD_CHARACTER_ALREADY_EXISTS') ||
        (action.action === 'try-migrate-with-participation' &&
          error.code === 'WORLD_CHARACTER_HAS_CAMPAIGN_PARTICIPATION'))
    )
      return result(
        action.action,
        `Rejected with ${error.code}.`,
        true,
        error.code,
      )
    throw error
  }
}

async function runAll(): Promise<DevScenarioActionResult> {
  await resetFixture()
  const checks: DevAcceptanceCheck[] = []
  const copy = await execute({ action: 'copy' })
  checks.push({
    id: 'copy',
    title: 'Copy preserves portable identity without Campaign participation',
    status: copy.ok ? 'passed' : 'failed',
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
    title: 'Campaign participation blocks migration without changes',
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
  checks.push({
    id: 'safe-migration',
    title: 'Migration preserves identity after participation is resolved',
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
  return {
    ok: checks.every((check) => check.status === 'passed'),
    message: 'Executed Issue #19 acceptance checks.',
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
    message: 'Removed only Issue #19 scenario records.',
    cleanup: {
      deleted: [
        'Scenario Worlds, Campaign, Character, WorldCharacters, and participation',
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
    return { ok: true, message: 'Reset Issue #19 fixture.' }
  },
  cleanup,
  runAll,
  isAction: isCharacterCopyMigrationAction,
  execute,
}
