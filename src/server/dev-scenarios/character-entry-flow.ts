import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  DevAcceptanceCheck,
  DevScenario,
  DevScenarioActionResult,
} from '@/dev/scenario-contracts'
import {
  isCharacterEntryFlowAction,
  type CharacterEntryFlowAction,
  type CharacterEntryFlowState,
} from '@/dev/scenarios/character-entry-flow'
import { prisma } from '@/lib/prisma'
import {
  CampaignCharacterService,
  PrismaCampaignCharacterRepository,
} from '@/server/campaign-characters'
import { CharacterService, PrismaCharacterRepository } from '@/server/characters'
import { WorldDomainError, worldService } from '@/server/worlds'
import {
  assertFixtureUsersOwned,
  FixtureOwnershipError,
} from './fixture-safety'
import { upsertFixturePeople } from './world-fixture'

const metadata = requireDevScenarioMetadata('character-entry-flow')
const PLAYER_ID = '54000000-0000-4000-8000-000000000001'
const GM_ID = '54000000-0000-4000-8000-000000000002'
const WORLD_ID = '54000000-0000-4000-8000-000000000010'
const TIMELINE_ID = '54000000-0000-4000-8000-000000000011'
const CAMPAIGN_ID = '54000000-0000-4000-8000-000000000020'
const CAMPAIGN_MEMBERSHIP_ID = '54000000-0000-4000-8000-000000000021'
const CHARACTER_ID = '54000000-0000-4000-8000-000000000030'
const WORLD_CHARACTER_ID = '54000000-0000-4000-8000-000000000031'
const CAMPAIGN_CHARACTER_ID = '54000000-0000-4000-8000-000000000032'

const people = [
  {
    id: PLAYER_ID,
    email: 'dev-issue54-player@weaveryn.local',
    username: 'issue54-player',
    displayName: 'Invited player',
  },
  {
    id: GM_ID,
    email: 'dev-issue54-gm@weaveryn.local',
    username: 'issue54-gm',
    displayName: 'Campaign GM',
  },
] as const

const characterService = (id = WORLD_CHARACTER_ID) =>
  new CharacterService(new PrismaCharacterRepository(prisma), () => id)
const campaignCharacterService = () =>
  new CampaignCharacterService(
    new PrismaCampaignCharacterRepository(prisma),
    () => CAMPAIGN_CHARACTER_ID,
  )

async function assertOwned() {
  const [users, world, timeline, campaign, membership, character, wc, cc] =
    await Promise.all([
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
      prisma.world.findUnique({
        where: { id: WORLD_ID },
        select: { id: true, ownerId: true, description: true },
      }),
      prisma.worldTimeline.findUnique({
        where: { id: TIMELINE_ID },
        select: { id: true, worldId: true, name: true },
      }),
      prisma.campaign.findUnique({
        where: { id: CAMPAIGN_ID },
        select: { id: true, worldId: true, ownerId: true, description: true },
      }),
      prisma.campaignMembership.findUnique({
        where: { id: CAMPAIGN_MEMBERSHIP_ID },
        select: { id: true, campaignId: true, userId: true, role: true },
      }),
      prisma.character.findUnique({
        where: { id: CHARACTER_ID },
        select: { id: true, ownerUserId: true, coreData: true },
      }),
      prisma.worldCharacter.findUnique({
        where: { id: WORLD_CHARACTER_ID },
        select: { id: true, characterId: true, worldId: true },
      }),
      prisma.campaignCharacter.findUnique({
        where: { id: CAMPAIGN_CHARACTER_ID },
        select: { id: true, worldCharacterId: true, campaignId: true },
      }),
    ])

  assertFixtureUsersOwned(users, [...people])

  if (
    world &&
    (world.ownerId !== GM_ID || world.description !== metadata.fixtureNamespace)
  ) {
    throw new FixtureOwnershipError('Issue #54 World fixture is not owned.')
  }
  if (
    timeline &&
    (timeline.worldId !== WORLD_ID || timeline.name !== 'Main')
  ) {
    throw new FixtureOwnershipError('Issue #54 timeline fixture is not owned.')
  }
  if (
    campaign &&
    (campaign.worldId !== WORLD_ID ||
      campaign.ownerId !== GM_ID ||
      campaign.description !== metadata.fixtureNamespace)
  ) {
    throw new FixtureOwnershipError('Issue #54 Campaign fixture is not owned.')
  }
  if (
    membership &&
    (membership.campaignId !== CAMPAIGN_ID ||
      membership.userId !== PLAYER_ID ||
      membership.role !== 'PLAYER')
  ) {
    throw new FixtureOwnershipError(
      'Issue #54 Campaign membership fixture is not owned.',
    )
  }
  if (
    character &&
    (character.ownerUserId !== PLAYER_ID ||
      (character.coreData as { marker?: string } | null)?.marker !==
        metadata.fixtureNamespace)
  ) {
    throw new FixtureOwnershipError('Issue #54 Character fixture is not owned.')
  }
  if (
    wc &&
    (wc.characterId !== CHARACTER_ID || wc.worldId !== WORLD_ID)
  ) {
    throw new FixtureOwnershipError(
      'Issue #54 WorldCharacter fixture is not owned.',
    )
  }
  if (
    cc &&
    (cc.worldCharacterId !== WORLD_CHARACTER_ID ||
      cc.campaignId !== CAMPAIGN_ID)
  ) {
    throw new FixtureOwnershipError(
      'Issue #54 CampaignCharacter fixture is not owned.',
    )
  }
}

async function resetFixture() {
  await prisma.$transaction(async (tx) => {
    await assertOwned()
    await tx.campaignCharacter.deleteMany({
      where: { id: CAMPAIGN_CHARACTER_ID },
    })
    await tx.worldCharacter.deleteMany({ where: { id: WORLD_CHARACTER_ID } })
    await tx.campaignMembership.deleteMany({
      where: { id: CAMPAIGN_MEMBERSHIP_ID },
    })
    await tx.campaign.deleteMany({
      where: { id: CAMPAIGN_ID, description: metadata.fixtureNamespace },
    })
    await tx.worldTimeline.deleteMany({ where: { id: TIMELINE_ID } })
    await tx.character.deleteMany({
      where: { id: CHARACTER_ID, ownerUserId: PLAYER_ID },
    })
    await tx.world.deleteMany({
      where: { id: WORLD_ID, description: metadata.fixtureNamespace },
    })

    await upsertFixturePeople(tx, people)
    await tx.world.create({
      data: {
        id: WORLD_ID,
        name: 'Issue 54 Invitation World',
        description: metadata.fixtureNamespace,
        ownerId: GM_ID,
      },
    })
    await tx.worldTimeline.create({
      data: { id: TIMELINE_ID, worldId: WORLD_ID, name: 'Main' },
    })
    await tx.campaign.create({
      data: {
        id: CAMPAIGN_ID,
        name: 'Issue 54 Invitation Campaign',
        description: metadata.fixtureNamespace,
        worldId: WORLD_ID,
        ownerId: GM_ID,
        timelineId: TIMELINE_ID,
        currentWorldPosition: '1',
        currentWorldDateLabel: 'Day 1',
      },
    })
    await tx.campaignMembership.create({
      data: {
        id: CAMPAIGN_MEMBERSHIP_ID,
        campaignId: CAMPAIGN_ID,
        userId: PLAYER_ID,
        role: 'PLAYER',
      },
    })
    await tx.character.create({
      data: {
        id: CHARACTER_ID,
        ownerUserId: PLAYER_ID,
        name: 'Bodwick',
        coreData: { marker: metadata.fixtureNamespace },
      },
    })
  })
}

async function readState(): Promise<CharacterEntryFlowState | null> {
  await assertOwned()
  const [player, world, campaign, character, worldMembership, wc, cc] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: PLAYER_ID },
        select: { id: true, displayName: true },
      }),
      prisma.world.findUnique({
        where: { id: WORLD_ID },
        select: { id: true, name: true, ownerId: true },
      }),
      prisma.campaign.findUnique({
        where: { id: CAMPAIGN_ID },
        select: { id: true, name: true },
      }),
      prisma.character.findUnique({
        where: { id: CHARACTER_ID },
        select: { id: true, name: true },
      }),
      prisma.worldMembership.findUnique({
        where: { worldId_userId: { worldId: WORLD_ID, userId: PLAYER_ID } },
        select: { id: true },
      }),
      prisma.worldCharacter.findUnique({
        where: { id: WORLD_CHARACTER_ID },
        select: { id: true, worldId: true, nameOverride: true },
      }),
      prisma.campaignCharacter.findUnique({
        where: { id: CAMPAIGN_CHARACTER_ID },
        select: {
          id: true,
          campaignId: true,
          worldCharacterId: true,
          status: true,
        },
      }),
    ])

  if (!player || !world || !campaign || !character) return null

  return {
    player,
    world,
    campaign: { ...campaign, role: 'PLAYER' },
    character,
    hasWorldMembership: Boolean(worldMembership),
    worldCharacter: wc,
    participation: cc,
  }
}

function activity(
  action: CharacterEntryFlowAction['action'],
  actual: string,
  status: 'passed' | 'failed',
): DevScenarioActionResult {
  return {
    ok: status === 'passed',
    message: actual,
    activity: {
      action,
      actor: 'Invited player',
      target: 'Issue #54 Campaign invitation flow',
      expected: 'PLAYER manages only their own Character participation',
      actual,
      status,
    },
  }
}

async function execute(
  action: CharacterEntryFlowAction,
): Promise<DevScenarioActionResult> {
  const state = await readState()
  if (!state) {
    return activity(action.action, 'Reset the fixture first.', 'failed')
  }

  if (action.action === 'create-world-character') {
    if (state.worldCharacter) {
      return activity(
        action.action,
        'WorldCharacter already exists; reset to run this action again.',
        'failed',
      )
    }
    await characterService().createWorldCharacter({
      actorUserId: PLAYER_ID,
      characterId: CHARACTER_ID,
      worldId: WORLD_ID,
      nameOverride: 'Bodwick of the Invitation World',
    })
    return activity(
      action.action,
      'PLAYER created their own WorldCharacter using Campaign-only World access.',
      'passed',
    )
  }

  if (!state.worldCharacter) {
    return activity(
      action.action,
      'Create the WorldCharacter before attaching it to the Campaign.',
      'failed',
    )
  }
  if (state.participation) {
    return activity(
      action.action,
      'Campaign participation already exists; reset to run this action again.',
      'failed',
    )
  }

  await campaignCharacterService().createCampaignCharacter({
    actorUserId: PLAYER_ID,
    worldCharacterId: WORLD_CHARACTER_ID,
    campaignId: CAMPAIGN_ID,
  })
  return activity(
    action.action,
    'PLAYER attached their own WorldCharacter after accepting Campaign membership.',
    'passed',
  )
}

async function runAll(): Promise<DevScenarioActionResult> {
  await resetFixture()
  const checks: DevAcceptanceCheck[] = []

  const initial = await readState()
  checks.push({
    id: 'campaign-membership-without-world-membership',
    title: 'Campaign membership does not create World membership',
    status:
      initial && !initial.hasWorldMembership && !initial.worldCharacter
        ? 'passed'
        : 'failed',
    detail:
      'The invited PLAYER starts with Campaign access but no WorldMembership and no WorldCharacter.',
  })

  const createResult = await execute({ action: 'create-world-character' })
  const afterWorldCharacter = await readState()
  checks.push({
    id: 'campaign-member-creates-own-world-character',
    title: 'Campaign-only PLAYER can create their own WorldCharacter',
    status:
      createResult.ok &&
      afterWorldCharacter?.worldCharacter?.id === WORLD_CHARACTER_ID &&
      !afterWorldCharacter.hasWorldMembership
        ? 'passed'
        : 'failed',
    detail: createResult.message,
  })

  let worldEditDenied = false
  try {
    await worldService.updateWorld(WORLD_ID, PLAYER_ID, {
      name: 'This must not be allowed',
    })
  } catch (error) {
    worldEditDenied =
      error instanceof WorldDomainError && error.code === 'WORLD_UPDATE_FORBIDDEN'
  }
  checks.push({
    id: 'no-general-world-edit-permission',
    title: 'Character access does not grant general World editing',
    status: worldEditDenied ? 'passed' : 'failed',
    detail:
      'The PLAYER can manage their own WorldCharacter while World configuration remains protected.',
  })

  const attachResult = await execute({ action: 'attach-to-campaign' })
  const afterAttach = await readState()
  checks.push({
    id: 'player-self-attaches-campaign-character',
    title: 'PLAYER attaches their own WorldCharacter after Campaign membership',
    status:
      attachResult.ok &&
      afterAttach?.participation?.worldCharacterId === WORLD_CHARACTER_ID &&
      afterAttach.participation.campaignId === CAMPAIGN_ID
        ? 'passed'
        : 'failed',
    detail: attachResult.message,
  })

  return {
    ok: checks.every((check) => check.status === 'passed'),
    message: 'Executed Issue #54 Character entry-flow checks.',
    checks,
  }
}

async function cleanup(): Promise<DevScenarioActionResult> {
  await prisma.$transaction(async (tx) => {
    await assertOwned()
    await tx.campaignCharacter.deleteMany({
      where: { id: CAMPAIGN_CHARACTER_ID },
    })
    await tx.worldCharacter.deleteMany({ where: { id: WORLD_CHARACTER_ID } })
    await tx.campaignMembership.deleteMany({
      where: { id: CAMPAIGN_MEMBERSHIP_ID },
    })
    await tx.campaign.deleteMany({
      where: { id: CAMPAIGN_ID, description: metadata.fixtureNamespace },
    })
    await tx.worldTimeline.deleteMany({ where: { id: TIMELINE_ID } })
    await tx.character.deleteMany({
      where: { id: CHARACTER_ID, ownerUserId: PLAYER_ID },
    })
    await tx.world.deleteMany({
      where: { id: WORLD_ID, description: metadata.fixtureNamespace },
    })
  })

  return {
    ok: true,
    message: 'Removed only Issue #54 Character entry-flow records.',
    cleanup: {
      deleted: [
        'Scenario CampaignCharacter, WorldCharacter, Character, Campaign membership, Campaign, timeline, and World',
      ],
      retained: ['Fixture users retained'],
    },
  }
}

export const characterEntryFlowScenario: DevScenario<
  CharacterEntryFlowState,
  CharacterEntryFlowAction
> = {
  metadata,
  readState,
  reset: async () => {
    await resetFixture()
    return { ok: true, message: 'Reset Issue #54 Character entry-flow fixture.' }
  },
  cleanup,
  runAll,
  isAction: isCharacterEntryFlowAction,
  execute,
}
