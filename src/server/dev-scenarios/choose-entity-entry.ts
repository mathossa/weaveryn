import type { Prisma } from '@/generated/prisma/client'
import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type { DevAcceptanceCheck, DevScenario } from '@/dev/scenario-contracts'
import type {
  ChooseEntityEntryAction,
  ChooseEntityEntryState,
} from '@/dev/scenarios/choose-entity-entry'
import { prisma } from '@/lib/prisma'
import {
  EntryPreferenceDomainError,
  characterEntryKey,
  getEntrySelection,
  getWeaverResume,
  listEntryPreferences,
  recordCharacterEntryUse,
  recordWeaverEntryUse,
  setCharacterEntryPinned,
} from '@/server/selection'
import { FixtureOwnershipError } from './fixture-safety'
import {
  assertWorldFixtureOwned,
  cleanupWorldFixture,
  upsertFixturePeople,
  type WorldFixtureDefinition,
} from './world-fixture'

const metadata = requireDevScenarioMetadata('choose-entity-entry')
const WORLD_ID = '51000000-0000-4000-8000-000000000001'
const OWNER_ID = '51000000-0000-4000-8000-00000000000a'
const CHARACTER_ID = '51000000-0000-4000-8000-000000000010'
const WORLD_CHARACTER_ID = '51000000-0000-4000-8000-000000000011'
const TIMELINE_ID = '51000000-0000-4000-8000-000000000020'
const CAMPAIGN_ONE_ID = '51000000-0000-4000-8000-000000000030'
const CAMPAIGN_TWO_ID = '51000000-0000-4000-8000-000000000031'
const CAMPAIGN_CHARACTER_ONE_ID = '51000000-0000-4000-8000-000000000040'
const CAMPAIGN_CHARACTER_TWO_ID = '51000000-0000-4000-8000-000000000041'
const MEMBERSHIP_ONE_ID = '51000000-0000-4000-8000-000000000050'
const MEMBERSHIP_TWO_ID = '51000000-0000-4000-8000-000000000051'

const fixture: WorldFixtureDefinition = {
  worldId: WORLD_ID,
  worldMarker: metadata.fixtureNamespace,
  people: [
    {
      id: OWNER_ID,
      email: 'dev-choose-entity-owner@weaveryn.local',
      username: 'choose-entity-entry-owner',
      displayName: 'Cora (Character owner and Weaver)',
    },
  ],
}

async function deleteScenarioDependants(transaction: Prisma.TransactionClient) {
  await transaction.entryPreference.deleteMany({
    where: {
      userId: OWNER_ID,
      OR: [
        { worldCharacterId: WORLD_CHARACTER_ID },
        { campaignId: { in: [CAMPAIGN_ONE_ID, CAMPAIGN_TWO_ID] } },
        { worldId: WORLD_ID },
      ],
    },
  })
  await transaction.campaignCharacter.deleteMany({
    where: {
      id: { in: [CAMPAIGN_CHARACTER_ONE_ID, CAMPAIGN_CHARACTER_TWO_ID] },
    },
  })
  await transaction.campaignMembership.deleteMany({
    where: { id: { in: [MEMBERSHIP_ONE_ID, MEMBERSHIP_TWO_ID] } },
  })
  await transaction.campaign.deleteMany({
    where: { id: { in: [CAMPAIGN_ONE_ID, CAMPAIGN_TWO_ID] } },
  })
  await transaction.worldCharacter.deleteMany({
    where: { id: WORLD_CHARACTER_ID },
  })
  await transaction.character.deleteMany({ where: { id: CHARACTER_ID } })
  await transaction.worldTimeline.deleteMany({ where: { id: TIMELINE_ID } })
}

async function resetFixture() {
  await prisma.$transaction(async (transaction) => {
    await assertWorldFixtureOwned(transaction, fixture)
    await deleteScenarioDependants(transaction)
    await transaction.world.deleteMany({
      where: { id: WORLD_ID, description: fixture.worldMarker },
    })
    await upsertFixturePeople(transaction, fixture.people)

    await transaction.world.create({
      data: {
        id: WORLD_ID,
        name: 'The Entry Loom',
        description: fixture.worldMarker,
        ownerId: OWNER_ID,
      },
    })
    await transaction.worldTimeline.create({
      data: {
        id: TIMELINE_ID,
        worldId: WORLD_ID,
        name: 'Main',
      },
    })
    await transaction.character.create({
      data: {
        id: CHARACTER_ID,
        ownerUserId: OWNER_ID,
        name: 'Bodwick',
      },
    })
    await transaction.worldCharacter.create({
      data: {
        id: WORLD_CHARACTER_ID,
        characterId: CHARACTER_ID,
        worldId: WORLD_ID,
      },
    })
    await transaction.campaign.createMany({
      data: [
        {
          id: CAMPAIGN_ONE_ID,
          name: 'The Verdant Vale',
          worldId: WORLD_ID,
          ownerId: OWNER_ID,
          timelineId: TIMELINE_ID,
          currentWorldPosition: '1',
          currentWorldDateLabel: 'Day 1',
        },
        {
          id: CAMPAIGN_TWO_ID,
          name: 'War of the Lance',
          worldId: WORLD_ID,
          ownerId: OWNER_ID,
          timelineId: TIMELINE_ID,
          currentWorldPosition: '2',
          currentWorldDateLabel: 'Day 2',
        },
      ],
    })
    await transaction.campaignMembership.createMany({
      data: [
        {
          id: MEMBERSHIP_ONE_ID,
          campaignId: CAMPAIGN_ONE_ID,
          userId: OWNER_ID,
          role: 'GM',
        },
        {
          id: MEMBERSHIP_TWO_ID,
          campaignId: CAMPAIGN_TWO_ID,
          userId: OWNER_ID,
          role: 'GM',
        },
      ],
    })
    await transaction.campaignCharacter.createMany({
      data: [
        {
          id: CAMPAIGN_CHARACTER_ONE_ID,
          worldCharacterId: WORLD_CHARACTER_ID,
          campaignId: CAMPAIGN_ONE_ID,
        },
        {
          id: CAMPAIGN_CHARACTER_TWO_ID,
          worldCharacterId: WORLD_CHARACTER_ID,
          campaignId: CAMPAIGN_TWO_ID,
        },
      ],
    })
  })
}

async function readState(): Promise<ChooseEntityEntryState | null> {
  const world = await prisma.world.findUnique({
    where: { id: WORLD_ID },
    select: { description: true },
  })
  if (!world) return null
  if (world.description !== fixture.worldMarker) {
    throw new FixtureOwnershipError(
      `World ${WORLD_ID} is not owned by this development scenario.`,
    )
  }

  const [selection, preferences] = await Promise.all([
    getEntrySelection(OWNER_ID),
    listEntryPreferences(OWNER_ID),
  ])
  const character = selection.characters.find(
    (choice) => choice.id === WORLD_CHARACTER_ID,
  )

  return {
    worldCharacter: character
      ? {
          id: character.id,
          name: character.name,
          worldName: character.worldName,
          campaigns: character.campaigns,
        }
      : null,
    preferences: preferences
      .filter(
        (preference) =>
          preference.worldCharacterId === WORLD_CHARACTER_ID ||
          preference.worldId === WORLD_ID,
      )
      .map((preference) => ({
        entryKey: preference.entryKey,
        pinned: preference.pinned,
        lastUsedAt: preference.lastUsedAt?.toISOString() ?? null,
        worldCharacterId: preference.worldCharacterId,
        campaignId: preference.campaignId,
        worldId: preference.worldId,
      })),
  }
}

function isAction(value: unknown): value is ChooseEntityEntryAction {
  if (!value || typeof value !== 'object') return false
  const request = value as Record<string, unknown>
  if (Object.keys(request).length !== 1) return false
  return (
    request.action === 'pin-first-campaign' ||
    request.action === 'use-second-campaign' ||
    request.action === 'use-weaver-second-campaign'
  )
}

async function executeAction(action: ChooseEntityEntryAction) {
  if (action.action === 'pin-first-campaign') {
    await setCharacterEntryPinned({
      userId: OWNER_ID,
      worldCharacterId: WORLD_CHARACTER_ID,
      campaignId: CAMPAIGN_ONE_ID,
      pinned: true,
    })
    return
  }

  if (action.action === 'use-second-campaign') {
    await recordCharacterEntryUse({
      userId: OWNER_ID,
      worldCharacterId: WORLD_CHARACTER_ID,
      campaignId: CAMPAIGN_TWO_ID,
    })
    return
  }

  await recordWeaverEntryUse({
    userId: OWNER_ID,
    worldId: WORLD_ID,
    campaignId: CAMPAIGN_TWO_ID,
  })
}

async function runAcceptanceChecks() {
  const checks: DevAcceptanceCheck[] = []
  await resetFixture()

  const initial = await readState()
  const campaignNames = initial?.worldCharacter?.campaigns.map(({ name }) => name)
  checks.push({
    id: 'campaign-entry-cards',
    title: 'One WorldCharacter exposes two Campaign entry contexts',
    status:
      campaignNames?.includes('The Verdant Vale') &&
      campaignNames.includes('War of the Lance')
        ? 'passed'
        : 'failed',
    actor: 'Cora',
    target: 'Bodwick in The Entry Loom',
    expected: 'Two distinct Campaign entry contexts',
    actual: campaignNames?.join(', ') ?? 'WorldCharacter missing',
    detail:
      'The production selection query supplies the Campaign contexts used to render separate Choose Entity cards.',
  })

  await executeAction({ action: 'pin-first-campaign' })
  const afterPin = await readState()
  const pinKey = characterEntryKey(WORLD_CHARACTER_ID, CAMPAIGN_ONE_ID)
  const pin = afterPin?.preferences.find(
    (preference) => preference.entryKey === pinKey,
  )
  checks.push({
    id: 'campaign-entry-pin',
    title: 'Pin belongs to one Character + Campaign entry',
    status: pin?.pinned ? 'passed' : 'failed',
    actor: 'Cora',
    target: 'Bodwick — The Verdant Vale',
    expected: `${pinKey} pinned`,
    actual: pin ? `${pin.entryKey}; pinned=${pin.pinned}` : 'Preference missing',
    detail:
      'Pinning uses the production entry-preference service and does not pin every appearance of the Character.',
  })

  await executeAction({ action: 'use-second-campaign' })
  const afterUse = await readState()
  const recentKey = characterEntryKey(WORLD_CHARACTER_ID, CAMPAIGN_TWO_ID)
  const recent = afterUse?.preferences.find(
    (preference) => preference.entryKey === recentKey,
  )
  checks.push({
    id: 'campaign-entry-recent',
    title: 'Entering a Campaign records recent use',
    status: recent?.lastUsedAt ? 'passed' : 'failed',
    actor: 'Cora',
    target: 'Bodwick — War of the Lance',
    expected: 'Persisted lastUsedAt',
    actual: recent?.lastUsedAt ?? 'No recent-use timestamp',
    detail:
      'The same service used by the production selection handoff records recency for ordering and resume highlighting.',
  })

  await executeAction({ action: 'use-weaver-second-campaign' })
  const weaverResume = await getWeaverResume(OWNER_ID)
  const weaverPassed =
    weaverResume?.world.id === WORLD_ID &&
    weaverResume.campaign?.id === CAMPAIGN_TWO_ID
  checks.push({
    id: 'weaver-resume',
    title: 'Weaver remembers the last managed Campaign context',
    status: weaverPassed ? 'passed' : 'failed',
    actor: 'Cora (Weaver)',
    target: 'The Entry Loom — War of the Lance',
    expected: 'Weaver resume points at World + Campaign',
    actual: weaverResume
      ? `${weaverResume.world.name} — ${weaverResume.campaign?.name ?? 'World only'}`
      : 'No Weaver resume state',
    detail:
      'Weaver resume is persisted as user navigation metadata and is revalidated against current management access.',
  })

  return checks
}

export const chooseEntityEntryScenario: DevScenario<
  ChooseEntityEntryState,
  ChooseEntityEntryAction
> = {
  metadata,
  readState,
  async reset() {
    await resetFixture()
    return {
      ok: true,
      message: 'Created the deterministic Choose Entity entry fixture.',
      activity: {
        action: 'reset',
        actor: 'Development fixture runner',
        target: metadata.fixtureNamespace,
        expected: 'One WorldCharacter with two Campaigns and no preferences',
        actual: 'Fixture reset',
        status: 'passed',
      },
    }
  },
  async cleanup() {
    const cleanup = await prisma.$transaction(async (transaction) => {
      await assertWorldFixtureOwned(transaction, fixture)
      await deleteScenarioDependants(transaction)
      return cleanupWorldFixture(transaction, fixture)
    })
    return {
      ok: true,
      message: cleanup.retained.length
        ? 'Scenario data was cleaned; referenced fixture users were intentionally retained.'
        : 'All disposable Choose Entity scenario data was removed.',
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
      message: `${passed}/${checks.length} Choose Entity checks passed.`,
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
  isAction,
  async execute(request) {
    await executeAction(request)
    const state = await readState()
    return {
      ok: true,
      message: `Executed ${request.action} through the production entry-preference service.`,
      activity: {
        action: request.action,
        actor: 'Cora',
        target: 'Choose Entity entry preferences',
        expected: 'Persist the requested navigation preference',
        actual: `${state?.preferences.length ?? 0} preference rows visible`,
        status: 'passed',
      },
    }
  },
  mapError(error) {
    if (error instanceof EntryPreferenceDomainError) {
      return {
        code: error.code,
        message: error.message,
        status: error.code === 'ENTRY_PREFERENCE_INVALID' ? 400 : 404,
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
