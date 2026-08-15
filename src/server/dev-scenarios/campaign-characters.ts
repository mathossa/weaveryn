import { randomUUID } from 'node:crypto'
import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  DevAcceptanceCheck,
  DevScenario,
  DevScenarioActionResult,
} from '@/dev/scenario-contracts'
import {
  isCampaignCharactersScenarioAction,
  type CampaignCharactersScenarioAction,
  type CampaignCharactersScenarioState,
} from '@/dev/scenarios/campaign-characters'
import { prisma } from '@/lib/prisma'
import {
  CampaignCharacterDomainError,
  CampaignCharacterService,
  PrismaCampaignCharacterRepository,
} from '@/server/campaign-characters'
import {
  assertFixtureUsersOwned,
  FixtureOwnershipError,
} from './fixture-safety'
import { upsertFixturePeople } from './world-fixture'

const metadata = requireDevScenarioMetadata('campaign-characters')
const GM_ID = '18000000-0000-4000-8000-0000000000a1'
const ASSISTANT_ID = '18000000-0000-4000-8000-0000000000a2'
const OWNER_ID = '18000000-0000-4000-8000-0000000000a3'
const OUTSIDER_ID = '18000000-0000-4000-8000-0000000000a4'
const WORLD_ID = '18000000-0000-4000-8000-0000000000b1'
const OTHER_WORLD_ID = '18000000-0000-4000-8000-0000000000b2'
const TIMELINE_ID = '18000000-0000-4000-8000-0000000000c1'
const OTHER_TIMELINE_ID = '18000000-0000-4000-8000-0000000000c2'
const FIRST_CAMPAIGN_ID = '18000000-0000-4000-8000-0000000000d1'
const SECOND_CAMPAIGN_ID = '18000000-0000-4000-8000-0000000000d2'
const OTHER_CAMPAIGN_ID = '18000000-0000-4000-8000-0000000000d3'
const CHARACTER_ID = '18000000-0000-4000-8000-0000000000e1'
const WORLD_CHARACTER_ID = '18000000-0000-4000-8000-0000000000e2'
const FIRST_PARTICIPATION_ID = '18000000-0000-4000-8000-0000000000f1'
const SECOND_PARTICIPATION_ID = '18000000-0000-4000-8000-0000000000f2'

const people = [
  {
    id: GM_ID,
    email: 'dev-issue18-gm@weaveryn.local',
    username: 'issue18-gm',
    displayName: 'Campaign GM',
  },
  {
    id: ASSISTANT_ID,
    email: 'dev-issue18-assistant@weaveryn.local',
    username: 'issue18-assistant',
    displayName: 'Assistant GM',
  },
  {
    id: OWNER_ID,
    email: 'dev-issue18-owner@weaveryn.local',
    username: 'issue18-owner',
    displayName: 'Character owner',
  },
  {
    id: OUTSIDER_ID,
    email: 'dev-issue18-outsider@weaveryn.local',
    username: 'issue18-outsider',
    displayName: 'Outsider',
  },
] as const

const service = (id = randomUUID()) =>
  new CampaignCharacterService(
    new PrismaCampaignCharacterRepository(prisma),
    () => id,
  )

async function assertOwned() {
  const [worlds, users, character, worldCharacter, campaigns, timelines] =
    await Promise.all([
      prisma.world.findMany({
        where: { id: { in: [WORLD_ID, OTHER_WORLD_ID] } },
        select: { id: true, description: true },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { id: { in: people.map((person) => person.id) } },
            { email: { in: people.map((person) => person.email) } },
            { username: { in: people.map((person) => person.username) } },
          ],
        },
        select: { id: true, email: true, username: true },
      }),
      prisma.character.findUnique({
        where: { id: CHARACTER_ID },
        select: { ownerUserId: true, coreData: true },
      }),
      prisma.worldCharacter.findUnique({
        where: { id: WORLD_CHARACTER_ID },
        select: { characterId: true, worldId: true },
      }),
      prisma.campaign.findMany({
        where: {
          id: {
            in: [FIRST_CAMPAIGN_ID, SECOND_CAMPAIGN_ID, OTHER_CAMPAIGN_ID],
          },
        },
        select: {
          id: true,
          description: true,
          ownerId: true,
          worldId: true,
          timelineId: true,
        },
      }),
      prisma.worldTimeline.findMany({
        where: { id: { in: [TIMELINE_ID, OTHER_TIMELINE_ID] } },
        select: { id: true, worldId: true },
      }),
    ])

  for (const world of worlds) {
    if (world.description !== metadata.fixtureNamespace) {
      throw new FixtureOwnershipError(
        `World ${world.id} is not owned by this scenario.`,
      )
    }
  }

  assertFixtureUsersOwned(users, [...people])

  if (
    character &&
    (character.ownerUserId !== OWNER_ID ||
      (character.coreData as { marker?: string } | null)?.marker !==
        metadata.fixtureNamespace)
  ) {
    throw new FixtureOwnershipError(
      'Character fixture is not owned by this scenario.',
    )
  }

  if (
    worldCharacter &&
    (worldCharacter.characterId !== CHARACTER_ID ||
      worldCharacter.worldId !== WORLD_ID)
  ) {
    throw new FixtureOwnershipError(
      'WorldCharacter fixture is not owned by this scenario.',
    )
  }

  const expectedCampaigns = new Map([
    [FIRST_CAMPAIGN_ID, { worldId: WORLD_ID, timelineId: TIMELINE_ID }],
    [SECOND_CAMPAIGN_ID, { worldId: WORLD_ID, timelineId: TIMELINE_ID }],
    [
      OTHER_CAMPAIGN_ID,
      { worldId: OTHER_WORLD_ID, timelineId: OTHER_TIMELINE_ID },
    ],
  ])
  for (const campaign of campaigns) {
    const expected = expectedCampaigns.get(campaign.id)
    if (
      !expected ||
      campaign.description !== metadata.fixtureNamespace ||
      campaign.ownerId !== GM_ID ||
      campaign.worldId !== expected.worldId ||
      campaign.timelineId !== expected.timelineId
    ) {
      throw new FixtureOwnershipError(
        `Campaign ${campaign.id} is not owned by this scenario.`,
      )
    }
  }

  const expectedTimelines = new Map([
    [TIMELINE_ID, WORLD_ID],
    [OTHER_TIMELINE_ID, OTHER_WORLD_ID],
  ])
  for (const timeline of timelines) {
    if (timeline.worldId !== expectedTimelines.get(timeline.id)) {
      throw new FixtureOwnershipError(
        `Timeline ${timeline.id} is not owned by this scenario.`,
      )
    }
  }
}

async function readState(): Promise<CampaignCharactersScenarioState | null> {
  await assertOwned()
  const character = await prisma.character.findUnique({
    where: { id: CHARACTER_ID },
    select: { id: true, name: true },
  })
  if (!character) return null
  const [worldCharacter, campaigns, participations] = await Promise.all([
    prisma.worldCharacter.findUnique({
      where: { id: WORLD_CHARACTER_ID },
      select: { id: true, worldId: true, nameOverride: true },
    }),
    prisma.campaign.findMany({
      where: {
        id: { in: [FIRST_CAMPAIGN_ID, SECOND_CAMPAIGN_ID, OTHER_CAMPAIGN_ID] },
      },
      select: { id: true, name: true, worldId: true },
      orderBy: { id: 'asc' },
    }),
    prisma.campaignCharacter.findMany({
      where: { worldCharacterId: WORLD_CHARACTER_ID },
      select: { id: true, campaignId: true, sheetData: true, status: true },
      orderBy: { id: 'asc' },
    }),
  ])
  return { character, worldCharacter, campaigns, participations }
}

async function resetFixture() {
  await prisma.$transaction(async (tx) => {
    await assertOwned()
    await tx.campaignCharacter.deleteMany({
      where: { worldCharacterId: WORLD_CHARACTER_ID },
    })
    await tx.campaign.deleteMany({
      where: {
        id: { in: [FIRST_CAMPAIGN_ID, SECOND_CAMPAIGN_ID, OTHER_CAMPAIGN_ID] },
        description: metadata.fixtureNamespace,
      },
    })
    await tx.worldCharacter.deleteMany({
      where: {
        id: WORLD_CHARACTER_ID,
        characterId: CHARACTER_ID,
        worldId: WORLD_ID,
      },
    })
    await tx.character.deleteMany({
      where: { id: CHARACTER_ID, ownerUserId: OWNER_ID },
    })
    await tx.world.deleteMany({
      where: {
        id: { in: [WORLD_ID, OTHER_WORLD_ID] },
        description: metadata.fixtureNamespace,
      },
    })
    await upsertFixturePeople(tx, people)
    await tx.world.createMany({
      data: [
        {
          id: WORLD_ID,
          ownerId: GM_ID,
          name: 'Issue 18 Aldorath',
          description: metadata.fixtureNamespace,
        },
        {
          id: OTHER_WORLD_ID,
          ownerId: GM_ID,
          name: 'Issue 18 Veyra',
          description: metadata.fixtureNamespace,
        },
      ],
    })
    await tx.worldTimeline.createMany({
      data: [
        { id: TIMELINE_ID, worldId: WORLD_ID, name: 'Main' },
        { id: OTHER_TIMELINE_ID, worldId: OTHER_WORLD_ID, name: 'Main' },
      ],
    })
    await tx.campaign.createMany({
      data: [
        {
          id: FIRST_CAMPAIGN_ID,
          name: 'Aldorath Dawn',
          description: metadata.fixtureNamespace,
          worldId: WORLD_ID,
          ownerId: GM_ID,
          timelineId: TIMELINE_ID,
          currentWorldPosition: 1,
          currentWorldDateLabel: 'Day 1',
        },
        {
          id: SECOND_CAMPAIGN_ID,
          name: 'Aldorath Dusk',
          description: metadata.fixtureNamespace,
          worldId: WORLD_ID,
          ownerId: GM_ID,
          timelineId: TIMELINE_ID,
          currentWorldPosition: 2,
          currentWorldDateLabel: 'Day 2',
        },
        {
          id: OTHER_CAMPAIGN_ID,
          name: 'Veyra',
          description: metadata.fixtureNamespace,
          worldId: OTHER_WORLD_ID,
          ownerId: GM_ID,
          timelineId: OTHER_TIMELINE_ID,
          currentWorldPosition: 1,
          currentWorldDateLabel: 'Day 1',
        },
      ],
    })
    await tx.campaignMembership.createMany({
      data: [
        { campaignId: FIRST_CAMPAIGN_ID, userId: GM_ID, role: 'GM' },
        { campaignId: SECOND_CAMPAIGN_ID, userId: GM_ID, role: 'GM' },
        { campaignId: OTHER_CAMPAIGN_ID, userId: GM_ID, role: 'GM' },
        {
          campaignId: FIRST_CAMPAIGN_ID,
          userId: ASSISTANT_ID,
          role: 'ASSISTANT_GM',
        },
        { campaignId: FIRST_CAMPAIGN_ID, userId: OWNER_ID, role: 'PLAYER' },
        {
          campaignId: SECOND_CAMPAIGN_ID,
          userId: ASSISTANT_ID,
          role: 'ASSISTANT_GM',
        },
      ],
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
        id: WORLD_CHARACTER_ID,
        characterId: CHARACTER_ID,
        worldId: WORLD_ID,
        nameOverride: 'Bodwick of Aldorath',
      },
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
      actor: 'Registered Issue #18 actor',
      target: 'CampaignCharacter fixture',
      expected: 'Registered service behavior',
      actual,
      status,
      domainErrorCode: code,
    },
  }
}

async function execute(
  action: CampaignCharactersScenarioAction,
): Promise<DevScenarioActionResult> {
  const current = await readState()
  if (!current)
    return activity(
      action.action,
      'Reset the deterministic fixture first.',
      'failed',
    )
  const hasFirst = current.participations.some(
    (record) => record.campaignId === FIRST_CAMPAIGN_ID,
  )
  try {
    if (action.action === 'add-first-participation') {
      await service(FIRST_PARTICIPATION_ID).createCampaignCharacter({
        actorUserId: GM_ID,
        worldCharacterId: WORLD_CHARACTER_ID,
        campaignId: FIRST_CAMPAIGN_ID,
        sheetData: { supplies: 12 },
        status: 'ACTIVE',
      })
      return activity(
        action.action,
        'GM added first Campaign participation.',
        'passed',
      )
    }
    if (action.action === 'add-second-participation') {
      await service(SECOND_PARTICIPATION_ID).createCampaignCharacter({
        actorUserId: ASSISTANT_ID,
        worldCharacterId: WORLD_CHARACTER_ID,
        campaignId: SECOND_CAMPAIGN_ID,
        sheetData: { supplies: 3 },
        status: 'RESTING',
      })
      return activity(
        action.action,
        'Assistant GM added independent second participation.',
        'passed',
      )
    }
    if (action.action === 'update-first-state') {
      const first = current.participations.find(
        (record) => record.campaignId === FIRST_CAMPAIGN_ID,
      )
      if (!first)
        return activity(
          action.action,
          'Create the first participation first.',
          'failed',
        )
      await service().updateCampaignCharacter(first.id, OWNER_ID, {
        sheetData: { supplies: 18 },
        status: 'INJURED',
      })
      return activity(
        action.action,
        'Character owner updated only their first Campaign state.',
        'passed',
      )
    }
    if (action.action === 'try-owner-without-membership-update') {
      const second = current.participations.find(
        (record) => record.campaignId === SECOND_CAMPAIGN_ID,
      )
      if (!second)
        return activity(
          action.action,
          'Create the second participation first.',
          'failed',
        )
      await service().updateCampaignCharacter(second.id, OWNER_ID, {
        status: 'STOLEN',
      })
      return activity(
        action.action,
        'Unexpectedly let the Character owner update without Campaign access.',
        'failed',
      )
    }
    if (action.action === 'remove-first-participation') {
      const first = current.participations.find(
        (record) => record.campaignId === FIRST_CAMPAIGN_ID,
      )
      if (!first)
        return activity(
          action.action,
          'Create the first participation first.',
          'failed',
        )
      await service().removeCampaignCharacter(first.id, ASSISTANT_ID)
      return activity(
        action.action,
        'Assistant GM removed participation only.',
        'passed',
      )
    }
    if (action.action === 'try-duplicate-participation') {
      if (!hasFirst)
        return activity(
          action.action,
          'Create the first participation first.',
          'failed',
        )
      await service().createCampaignCharacter({
        actorUserId: GM_ID,
        worldCharacterId: WORLD_CHARACTER_ID,
        campaignId: FIRST_CAMPAIGN_ID,
      })
      return activity(
        action.action,
        'Unexpectedly created duplicate participation.',
        'failed',
      )
    }
    await service().createCampaignCharacter({
      actorUserId: GM_ID,
      worldCharacterId: WORLD_CHARACTER_ID,
      campaignId: OTHER_CAMPAIGN_ID,
    })
    return activity(
      action.action,
      'Unexpectedly created cross-World participation.',
      'failed',
    )
  } catch (error) {
    if (
      error instanceof CampaignCharacterDomainError &&
      ((action.action === 'try-duplicate-participation' &&
        error.code === 'CAMPAIGN_CHARACTER_ALREADY_EXISTS') ||
        (action.action === 'try-cross-world-participation' &&
          error.code === 'CAMPAIGN_CHARACTER_CROSS_WORLD') ||
        (action.action === 'try-owner-without-membership-update' &&
          error.code === 'CAMPAIGN_CHARACTER_PERMISSION_DENIED'))
    ) {
      return activity(
        action.action,
        `Rejected with ${error.code}.`,
        'passed',
        error.code,
      )
    }
    throw error
  }
}

async function runAll(): Promise<DevScenarioActionResult> {
  await resetFixture()
  const checks: DevAcceptanceCheck[] = []
  await execute({ action: 'add-first-participation' })
  await execute({ action: 'add-second-participation' })
  const beforeUpdate = await readState()
  checks.push({
    id: 'same-world-multiple-state',
    title:
      'One WorldCharacter participates in two same-World Campaigns independently',
    status:
      beforeUpdate?.participations.length === 2 &&
      JSON.stringify(
        beforeUpdate.participations.map((record) => record.sheetData).sort(),
      ) === JSON.stringify([{ supplies: 12 }, { supplies: 3 }].sort())
        ? 'passed'
        : 'failed',
    detail:
      'GM and Assistant GM created separate participations with distinct generic state.',
  })
  await execute({ action: 'update-first-state' })
  const afterUpdate = await readState()
  checks.push({
    id: 'owner-state-update',
    title: 'Character owner updates only their selected Campaign state',
    status:
      afterUpdate?.participations.some(
        (record) =>
          record.campaignId === FIRST_CAMPAIGN_ID &&
          record.status === 'INJURED',
      ) &&
      afterUpdate.participations.some(
        (record) =>
          record.campaignId === SECOND_CAMPAIGN_ID &&
          record.status === 'RESTING',
      )
        ? 'passed'
        : 'failed',
    detail: 'Campaign-specific state remains independent.',
  })
  for (const action of [
    { action: 'try-duplicate-participation' } as const,
    { action: 'try-cross-world-participation' } as const,
  ]) {
    const result = await execute(action)
    checks.push({
      id: action.action,
      title:
        action.action === 'try-duplicate-participation'
          ? 'Duplicate participation is rejected'
          : 'Cross-World participation is rejected without a write',
      status: result.ok ? 'passed' : 'failed',
      detail: result.message,
      domainErrorCode: result.activity?.domainErrorCode,
    })
  }
  const unauthorizedOwnerUpdate = await execute({
    action: 'try-owner-without-membership-update',
  })
  checks.push({
    id: 'character-owner-needs-campaign-access',
    title: 'Character ownership alone does not grant Campaign-state access',
    status: unauthorizedOwnerUpdate.ok ? 'passed' : 'failed',
    detail: unauthorizedOwnerUpdate.message,
    domainErrorCode: unauthorizedOwnerUpdate.activity?.domainErrorCode,
  })

  const afterRejected = await readState()
  checks.push({
    id: 'rejected-write-count',
    title: 'Rejected cross-World request leaves no invalid participation',
    status: afterRejected?.participations.length === 2 ? 'passed' : 'failed',
    detail:
      'The fixture still has exactly its two valid same-World participations.',
  })
  await execute({ action: 'remove-first-participation' })
  const afterRemoval = await readState()
  checks.push({
    id: 'removal-preserves-identity',
    title: 'Removing participation preserves WorldCharacter and Character',
    status:
      afterRemoval?.worldCharacter?.id === WORLD_CHARACTER_ID &&
      afterRemoval.character?.id === CHARACTER_ID &&
      afterRemoval.participations.length === 1
        ? 'passed'
        : 'failed',
    detail: 'Only the selected CampaignCharacter was deleted.',
  })
  return {
    ok: checks.every((check) => check.status === 'passed'),
    message: 'Executed Issue #18 acceptance checks.',
    checks,
  }
}

async function cleanup(): Promise<DevScenarioActionResult> {
  await prisma.$transaction(async (tx) => {
    await assertOwned()
    await tx.campaignCharacter.deleteMany({
      where: { worldCharacterId: WORLD_CHARACTER_ID },
    })
    await tx.campaign.deleteMany({
      where: {
        id: { in: [FIRST_CAMPAIGN_ID, SECOND_CAMPAIGN_ID, OTHER_CAMPAIGN_ID] },
        description: metadata.fixtureNamespace,
      },
    })
    await tx.worldCharacter.deleteMany({
      where: {
        id: WORLD_CHARACTER_ID,
        characterId: CHARACTER_ID,
        worldId: WORLD_ID,
      },
    })
    await tx.character.deleteMany({
      where: { id: CHARACTER_ID, ownerUserId: OWNER_ID },
    })
    await tx.world.deleteMany({
      where: {
        id: { in: [WORLD_ID, OTHER_WORLD_ID] },
        description: metadata.fixtureNamespace,
      },
    })
  })
  return {
    ok: true,
    message: 'Removed only Issue #18 scenario records.',
    cleanup: {
      deleted: [
        'Scenario CampaignCharacters, Campaigns, WorldCharacter, Character, and Worlds',
      ],
      retained: ['Fixture users retained'],
    },
  }
}

export const campaignCharactersScenario: DevScenario<
  CampaignCharactersScenarioState,
  CampaignCharactersScenarioAction
> = {
  metadata,
  readState,
  reset: async () => {
    await resetFixture()
    return { ok: true, message: 'Reset Issue #18 fixture.' }
  },
  cleanup,
  runAll,
  isAction: isCampaignCharactersScenarioAction,
  execute,
}
