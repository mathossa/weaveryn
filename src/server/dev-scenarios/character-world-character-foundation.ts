import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import { randomUUID } from 'node:crypto'
import type {
  DevAcceptanceCheck,
  DevScenario,
  DevScenarioActionResult,
} from '@/dev/scenario-contracts'
import {
  isCharacterFoundationAction,
  type CharacterFoundationAction,
  type CharacterFoundationState,
} from '@/dev/scenarios/character-world-character-foundation'
import { prisma } from '@/lib/prisma'
import {
  CharacterDomainError,
  CharacterService,
  PrismaCharacterRepository,
} from '@/server/characters'
import { FixtureOwnershipError } from './fixture-safety'

const metadata = requireDevScenarioMetadata(
  'character-world-character-foundation',
)
const OWNER_ID = '17000000-0000-4000-8000-0000000000a1'
const OUTSIDER_ID = '17000000-0000-4000-8000-0000000000a2'
const WORLD_ONE_ID = '17000000-0000-4000-8000-0000000000b1'
const WORLD_TWO_ID = '17000000-0000-4000-8000-0000000000b2'
const CHARACTER_ID = '17000000-0000-4000-8000-0000000000c1'
const WORLD_CHARACTER_ONE_ID = '17000000-0000-4000-8000-0000000000d1'
const WORLD_CHARACTER_TWO_ID = '17000000-0000-4000-8000-0000000000d2'
const ids = [CHARACTER_ID, WORLD_CHARACTER_ONE_ID, WORLD_CHARACTER_TWO_ID]
const service = () => {
  let index = 0
  return new CharacterService(
    new PrismaCharacterRepository(prisma),
    () => ids[index++] ?? randomUUID(),
  )
}

async function assertOwned() {
  const worlds = await prisma.world.findMany({
    where: { id: { in: [WORLD_ONE_ID, WORLD_TWO_ID] } },
    select: { id: true, description: true },
  })
  for (const world of worlds)
    if (world.description !== metadata.fixtureNamespace)
      throw new FixtureOwnershipError(
        `World ${world.id} is not owned by this scenario.`,
      )
  const character = await prisma.character.findUnique({
    where: { id: CHARACTER_ID },
    select: { ownerUserId: true, coreData: true },
  })
  if (
    character &&
    (character.ownerUserId !== OWNER_ID ||
      (character.coreData as { marker?: string } | null)?.marker !==
        metadata.fixtureNamespace)
  )
    throw new FixtureOwnershipError(
      'Character fixture is not owned by this scenario.',
    )
}
async function readState(): Promise<CharacterFoundationState | null> {
  await assertOwned()
  const character = await prisma.character.findUnique({
    where: { id: CHARACTER_ID },
    select: { id: true, ownerUserId: true, name: true, coreData: true },
  })
  if (!character) return null
  const [worlds, worldCharacters] = await Promise.all([
    prisma.world.findMany({
      where: { id: { in: [WORLD_ONE_ID, WORLD_TWO_ID] } },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    }),
    prisma.worldCharacter.findMany({
      where: { characterId: CHARACTER_ID },
      select: { id: true, worldId: true, nameOverride: true, worldData: true },
      orderBy: { id: 'asc' },
    }),
  ])
  return { character, worlds, worldCharacters }
}
async function resetFixture() {
  await prisma.$transaction(async (tx) => {
    await assertOwned()
    await tx.worldCharacter.deleteMany({ where: { characterId: CHARACTER_ID } })
    await tx.character.deleteMany({
      where: { id: CHARACTER_ID, ownerUserId: OWNER_ID },
    })
    await tx.world.deleteMany({
      where: {
        id: { in: [WORLD_ONE_ID, WORLD_TWO_ID] },
        description: metadata.fixtureNamespace,
      },
    })
    for (const [id, email, username, displayName] of [
      [
        OWNER_ID,
        'dev-issue17-owner@weaveryn.local',
        'issue17-owner',
        'Bodwick owner',
      ],
      [
        OUTSIDER_ID,
        'dev-issue17-outsider@weaveryn.local',
        'issue17-outsider',
        'Unauthorised user',
      ],
    ] as const)
      await tx.user.upsert({
        where: { id },
        create: { id, email, username, displayName },
        update: { email, username, displayName },
      })
    await tx.world.createMany({
      data: [
        {
          id: WORLD_ONE_ID,
          ownerId: OWNER_ID,
          name: 'Issue 17 Aldorath',
          description: metadata.fixtureNamespace,
        },
        {
          id: WORLD_TWO_ID,
          ownerId: OWNER_ID,
          name: 'Issue 17 Veyra',
          description: metadata.fixtureNamespace,
        },
      ],
    })
  })
}
function activity(
  action: string,
  actual: string,
  status: 'passed' | 'failed',
  code?: string,
): DevScenarioActionResult {
  return {
    ok: status === 'passed',
    message: actual,
    activity: {
      action,
      actor: 'Bodwick owner',
      target: 'Issue #17 fixture',
      expected: 'Registered service behavior',
      actual,
      status,
      domainErrorCode: code,
    },
  }
}
async function createCharacter() {
  return service().createCharacter({
    ownerUserId: OWNER_ID,
    name: 'Bodwick',
    coreData: { marker: metadata.fixtureNamespace, concept: 'portable bard' },
  })
}
async function execute(
  action: CharacterFoundationAction,
): Promise<DevScenarioActionResult> {
  const current = await readState()
  if (!current && action.action !== 'create-character')
    return activity(
      action.action,
      'Create the portable Character first.',
      'failed',
    )
  try {
    if (action.action === 'create-character') {
      await createCharacter()
      return activity(
        action.action,
        'Character created through CharacterService.',
        'passed',
      )
    }
    if (action.action === 'create-second-incarnation') {
      await service().createWorldCharacter({
        actorUserId: OWNER_ID,
        characterId: CHARACTER_ID,
        worldId: WORLD_TWO_ID,
        worldData: { culture: 'Veyran' },
      })
      return activity(
        action.action,
        'Second WorldCharacter created in Veyra.',
        'passed',
      )
    }
    if (action.action === 'update-character') {
      await service().updateCharacter(CHARACTER_ID, OWNER_ID, {
        name: 'Bodwick the Wayfarer',
        coreData: {
          marker: metadata.fixtureNamespace,
          concept: 'updated portable bard',
        },
      })
      return activity(action.action, 'Portable Character updated.', 'passed')
    }
    if (action.action === 'update-world-character') {
      const wc = current!.worldCharacters[0]
      if (!wc) {
        await service().createWorldCharacter({
          actorUserId: OWNER_ID,
          characterId: CHARACTER_ID,
          worldId: WORLD_ONE_ID,
          nameOverride: 'Bodwick of Aldorath',
          worldData: { history: 'Aldoran' },
        })
        return activity(
          action.action,
          'Aldorath WorldCharacter created.',
          'passed',
        )
      }
      await service().updateWorldCharacter(wc.id, OWNER_ID, {
        nameOverride: 'Bodwick the Aldoran',
        worldData: { history: 'updated Aldoran history' },
      })
      return activity(
        action.action,
        'World-specific incarnation updated.',
        'passed',
      )
    }
    if (action.action === 'unauthorized-update') {
      const wc = current!.worldCharacters[0]
      if (!wc)
        return activity(action.action, 'Create an incarnation first.', 'failed')
      await service().updateWorldCharacter(wc.id, OUTSIDER_ID, {
        nameOverride: 'stolen',
      })
      return activity(action.action, 'Unexpectedly authorized.', 'failed')
    }
    await service().createWorldCharacter({
      actorUserId: OWNER_ID,
      characterId: CHARACTER_ID,
      worldId: WORLD_ONE_ID,
    })
    return activity(action.action, 'Unexpectedly created duplicate.', 'failed')
  } catch (error) {
    if (
      error instanceof CharacterDomainError &&
      ((action.action === 'unauthorized-update' &&
        error.code === 'WORLD_CHARACTER_NOT_FOUND') ||
        (action.action === 'duplicate-incarnation' &&
          error.code === 'WORLD_CHARACTER_ALREADY_EXISTS'))
    )
      return activity(
        action.action,
        `Rejected with ${error.code}.`,
        'passed',
        error.code,
      )
    throw error
  }
}
async function runAll(): Promise<DevScenarioActionResult> {
  const checks: DevAcceptanceCheck[] = []
  await resetFixture()
  await createCharacter()
  const created = await service().createWorldCharacter({
    actorUserId: OWNER_ID,
    characterId: CHARACTER_ID,
    worldId: WORLD_ONE_ID,
    nameOverride: 'Bodwick of Aldorath',
    worldData: { culture: 'Aldoran' },
  })
  const second = await service().createWorldCharacter({
    actorUserId: OWNER_ID,
    characterId: CHARACTER_ID,
    worldId: WORLD_TWO_ID,
    worldData: { culture: 'Veyran' },
  })
  const portable = await service().loadCharacter(CHARACTER_ID, OWNER_ID)
  checks.push({
    id: 'portable-and-multiple-worlds',
    title: 'Portable Character has World-specific incarnations',
    status:
      portable?.name === 'Bodwick' && created.worldId !== second.worldId
        ? 'passed'
        : 'failed',
    detail: 'One user-owned Character links to two distinct Worlds.',
  })
  const duplicate = await execute({ action: 'duplicate-incarnation' })
  checks.push({
    id: 'unique-incarnation',
    title: 'One incarnation per World is enforced',
    status: duplicate.ok ? 'passed' : 'failed',
    detail: duplicate.message,
    domainErrorCode: duplicate.activity?.domainErrorCode,
  })
  const denied = await execute({ action: 'unauthorized-update' })
  checks.push({
    id: 'unauthorized-update',
    title: 'Unowned incarnation cannot be updated',
    status: denied.ok ? 'passed' : 'failed',
    detail: denied.message,
    domainErrorCode: denied.activity?.domainErrorCode,
  })
  await service().updateCharacter(CHARACTER_ID, OWNER_ID, {
    name: 'Bodwick the Wayfarer',
  })
  await service().updateWorldCharacter(created.id, OWNER_ID, {
    nameOverride: 'Bodwick the Aldoran',
  })
  const after = await readState()
  checks.push({
    id: 'independent-updates',
    title: 'Portable and World-specific fields update independently',
    status:
      after?.character?.name === 'Bodwick the Wayfarer' &&
      after.worldCharacters.some(
        (wc) => wc.nameOverride === 'Bodwick the Aldoran',
      )
        ? 'passed'
        : 'failed',
    detail: 'Character name and World override are stored separately.',
  })
  return {
    ok: checks.every((check) => check.status === 'passed'),
    message: 'Executed Issue #17 acceptance checks.',
    checks,
  }
}
async function cleanup(): Promise<DevScenarioActionResult> {
  await prisma.$transaction(async (tx) => {
    await assertOwned()
    await tx.worldCharacter.deleteMany({ where: { characterId: CHARACTER_ID } })
    await tx.character.deleteMany({
      where: { id: CHARACTER_ID, ownerUserId: OWNER_ID },
    })
    await tx.world.deleteMany({
      where: {
        id: { in: [WORLD_ONE_ID, WORLD_TWO_ID] },
        description: metadata.fixtureNamespace,
      },
    })
  })
  return {
    ok: true,
    message: 'Removed only Issue #17 scenario records.',
    cleanup: {
      deleted: ['Scenario Worlds, WorldCharacters, and Character'],
      retained: ['Fixture users retained'],
    },
  }
}
export const characterWorldCharacterFoundationScenario: DevScenario<
  CharacterFoundationState,
  CharacterFoundationAction
> = {
  metadata,
  readState,
  reset: async () => {
    await resetFixture()
    return { ok: true, message: 'Reset Issue #17 fixture.' }
  },
  cleanup,
  runAll,
  isAction: isCharacterFoundationAction,
  execute,
}
