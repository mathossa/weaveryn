import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type { DevAcceptanceCheck, DevScenario } from '@/dev/scenario-contracts'
import {
  isCampaignMembershipScenarioAction,
  type CampaignMembershipScenarioAction,
  type CampaignMembershipScenarioActor,
  type CampaignMembershipsScenarioState,
} from '@/dev/scenarios/campaign-memberships'
import { prisma } from '@/lib/prisma'
import {
  CampaignDomainError,
  CampaignMembershipService,
  PrismaCampaignRepository,
} from '@/server/campaigns'
import { FixtureOwnershipError } from './fixture-safety'
import { upsertFixturePeople } from './world-fixture'

const metadata = requireDevScenarioMetadata('campaign-memberships')
const CAMPAIGN_ID = '16000000-0000-4000-8000-000000000001'
const OWNER_ID = '16000000-0000-4000-8000-00000000000a'
const GM_ID = '16000000-0000-4000-8000-00000000000b'
const ASSISTANT_ID = '16000000-0000-4000-8000-00000000000c'
const PLAYER_ID = '16000000-0000-4000-8000-00000000000d'
const SPECTATOR_ID = '16000000-0000-4000-8000-00000000000e'
const NEW_MEMBER_ID = '16000000-0000-4000-8000-00000000000f'

const people = [
  {
    id: OWNER_ID,
    email: 'dev-memberships-owner@weaveryn.local',
    username: 'memberships-owner',
    displayName: 'Aria (Campaign owner)',
  },
  {
    id: GM_ID,
    email: 'dev-memberships-gm@weaveryn.local',
    username: 'memberships-gm',
    displayName: 'Bram (GM)',
  },
  {
    id: ASSISTANT_ID,
    email: 'dev-memberships-assistant@weaveryn.local',
    username: 'memberships-assistant',
    displayName: 'Cora (Assistant GM)',
  },
  {
    id: PLAYER_ID,
    email: 'dev-memberships-player@weaveryn.local',
    username: 'memberships-player',
    displayName: 'Dain (Player)',
  },
  {
    id: SPECTATOR_ID,
    email: 'dev-memberships-spectator@weaveryn.local',
    username: 'memberships-spectator',
    displayName: 'Eve (Spectator)',
  },
  {
    id: NEW_MEMBER_ID,
    email: 'dev-memberships-new-member@weaveryn.local',
    username: 'memberships-new-member',
    displayName: 'Finn (Available user)',
  },
] as const

const actorIds: Record<CampaignMembershipScenarioActor, string> = {
  OWNER: OWNER_ID,
  GM: GM_ID,
  ASSISTANT_GM: ASSISTANT_ID,
  PLAYER: PLAYER_ID,
  SPECTATOR: SPECTATOR_ID,
}

function service() {
  return new CampaignMembershipService(new PrismaCampaignRepository(prisma))
}

async function assertFixtureOwned() {
  const campaign = await prisma.campaign.findUnique({
    where: { id: CAMPAIGN_ID },
    select: { id: true, ownerId: true, description: true },
  })
  if (
    campaign &&
    (campaign.ownerId !== OWNER_ID ||
      campaign.description !== metadata.fixtureNamespace)
  ) {
    throw new FixtureOwnershipError(
      `Campaign ${CAMPAIGN_ID} is not owned by this development scenario.`,
    )
  }
}

async function readState(): Promise<CampaignMembershipsScenarioState | null> {
  await assertFixtureOwned()
  const campaign = await prisma.campaign.findUnique({
    where: { id: CAMPAIGN_ID },
    select: {
      id: true,
      name: true,
      ownerId: true,
      memberships: {
        select: { userId: true, role: true },
        orderBy: { userId: 'asc' },
      },
    },
  })
  if (!campaign) return null
  const users = await prisma.user.findMany({
    where: { id: { in: people.map((person) => person.id) } },
    select: { id: true, displayName: true },
    orderBy: { id: 'asc' },
  })
  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      ownerId: campaign.ownerId,
    },
    people: users.map((person) => ({
      ...person,
      key:
        Object.entries(actorIds).find(([, id]) => id === person.id)?.[0] ??
        'AVAILABLE',
    })),
    memberships: campaign.memberships,
  }
}

async function resetFixture() {
  await prisma.$transaction(async (transaction) => {
    await assertFixtureOwned()
    await transaction.campaign.deleteMany({
      where: {
        id: CAMPAIGN_ID,
        ownerId: OWNER_ID,
        description: metadata.fixtureNamespace,
      },
    })
    await upsertFixturePeople(transaction, [...people])
    await transaction.campaign.create({
      data: {
        id: CAMPAIGN_ID,
        name: 'The Lanternfall Expedition',
        description: metadata.fixtureNamespace,
        ownerId: OWNER_ID,
        memberships: {
          create: [
            { userId: OWNER_ID, role: 'GM' },
            { userId: GM_ID, role: 'GM' },
            { userId: ASSISTANT_ID, role: 'ASSISTANT_GM' },
            { userId: PLAYER_ID, role: 'PLAYER' },
            { userId: SPECTATOR_ID, role: 'SPECTATOR' },
          ],
        },
      },
    })
  })
}

function roleOf(
  state: CampaignMembershipsScenarioState | null,
  userId: string,
) {
  return (
    state?.memberships.find((membership) => membership.userId === userId)
      ?.role ?? null
  )
}

async function runAll() {
  await resetFixture()
  const checks: DevAcceptanceCheck[] = []
  let state = await readState()
  checks.push({
    id: 'owner-gm',
    title: 'Campaign owner has a GM membership',
    status: roleOf(state, OWNER_ID) === 'GM' ? 'passed' : 'failed',
    actor: 'Aria',
    target: 'Owner membership',
    expected: 'GM',
    actual: roleOf(state, OWNER_ID) ?? 'missing',
    detail:
      'Ownership remains on Campaign.ownerId; the functional role is a separate GM membership.',
  })
  await service().changeMemberRole({
    actorUserId: OWNER_ID,
    campaignId: CAMPAIGN_ID,
    userId: PLAYER_ID,
    role: 'ASSISTANT_GM',
  })
  state = await readState()
  checks.push({
    id: 'change-role',
    title: 'Owner changes a membership role',
    status: roleOf(state, PLAYER_ID) === 'ASSISTANT_GM' ? 'passed' : 'failed',
    actor: 'Aria',
    target: 'Dain',
    expected: 'ASSISTANT_GM',
    actual: roleOf(state, PLAYER_ID) ?? 'missing',
    detail: 'The real membership service persisted the role change.',
  })
  let duplicate: string | null = null
  try {
    await service().addMember({
      actorUserId: OWNER_ID,
      campaignId: CAMPAIGN_ID,
      userId: PLAYER_ID,
      role: 'PLAYER',
    })
  } catch (error) {
    duplicate = error instanceof CampaignDomainError ? error.code : null
  }
  checks.push({
    id: 'duplicate',
    title: 'Duplicate membership is rejected',
    status:
      duplicate === 'CAMPAIGN_MEMBERSHIP_ALREADY_EXISTS' ? 'passed' : 'failed',
    actor: 'Aria',
    target: 'Dain',
    expected: 'CAMPAIGN_MEMBERSHIP_ALREADY_EXISTS',
    actual: duplicate ?? 'no domain error',
    domainErrorCode: duplicate,
    detail:
      'The unique user/Campaign invariant is enforced by the service and database constraint.',
  })
  let forbidden: string | null = null
  try {
    await service().addMember({
      actorUserId: GM_ID,
      campaignId: CAMPAIGN_ID,
      userId: SPECTATOR_ID,
      role: 'PLAYER',
    })
  } catch (error) {
    forbidden = error instanceof CampaignDomainError ? error.code : null
  }
  checks.push({
    id: 'unauthorized',
    title: 'Non-owner cannot manage memberships',
    status: forbidden === 'CAMPAIGN_MEMBERSHIP_FORBIDDEN' ? 'passed' : 'failed',
    actor: 'Bram (GM)',
    target: 'Eve',
    expected: 'CAMPAIGN_MEMBERSHIP_FORBIDDEN',
    actual: forbidden ?? 'no domain error',
    domainErrorCode: forbidden,
    detail:
      'Campaign membership management remains an owner-only backend authorization boundary.',
  })
  await service().removeMember({
    actorUserId: OWNER_ID,
    campaignId: CAMPAIGN_ID,
    userId: SPECTATOR_ID,
  })
  state = await readState()
  checks.push({
    id: 'remove',
    title: 'Owner removes a membership',
    status: roleOf(state, SPECTATOR_ID) === null ? 'passed' : 'failed',
    actor: 'Aria',
    target: 'Eve',
    expected: 'No membership',
    actual: roleOf(state, SPECTATOR_ID) ?? 'removed',
    detail:
      'The real membership service removed only the selected non-owner member.',
  })
  return checks
}

export const campaignMembershipsScenario: DevScenario<
  CampaignMembershipsScenarioState,
  CampaignMembershipScenarioAction
> = {
  metadata,
  readState,
  async reset() {
    await resetFixture()
    return {
      ok: true,
      message: 'Created the deterministic Campaign membership fixture.',
    }
  },
  async cleanup() {
    await prisma.$transaction(async (transaction) => {
      await assertFixtureOwned()
      await transaction.campaign.deleteMany({
        where: {
          id: CAMPAIGN_ID,
          ownerId: OWNER_ID,
          description: metadata.fixtureNamespace,
        },
      })
    })
    return {
      ok: true,
      message: 'Removed only the Campaign membership fixture.',
      cleanup: {
        deleted: ['Campaign membership fixture and its cascading memberships'],
        retained: ['Six referenced fixture users'],
      },
    }
  },
  async runAll() {
    const checks = await runAll()
    return {
      ok: checks.every((check) => check.status === 'passed'),
      message: 'Executed Campaign membership acceptance checks.',
      checks,
    }
  },
  isAction: isCampaignMembershipScenarioAction,
  async execute(action) {
    if (action.action === 'add')
      await service().addMember({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: NEW_MEMBER_ID,
        role: action.role,
      })
    else if (action.action === 'change-player-to-assistant')
      await service().changeMemberRole({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: PLAYER_ID,
        role: 'ASSISTANT_GM',
      })
    else if (action.action === 'remove-spectator')
      await service().removeMember({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: SPECTATOR_ID,
      })
    else if (action.action === 'duplicate-player')
      await service().addMember({
        actorUserId: OWNER_ID,
        campaignId: CAMPAIGN_ID,
        userId: PLAYER_ID,
        role: 'PLAYER',
      })
    else
      await service().addMember({
        actorUserId: actorIds[action.actor],
        campaignId: CAMPAIGN_ID,
        userId: NEW_MEMBER_ID,
        role: 'PLAYER',
      })
    return {
      ok: true,
      message: 'Membership action completed through CampaignMembershipService.',
    }
  },
  mapError(error, action) {
    if (!(error instanceof CampaignDomainError)) return null
    return {
      code: error.code,
      message: error.message,
      status: 409,
      activity: {
        action:
          action && typeof action === 'object' && 'action' in action
            ? String(action.action)
            : 'Membership action',
        actor: 'Registered scenario actor',
        target: 'Campaign membership',
        expected: 'Registered service behavior',
        actual: error.message,
        status: 'failed',
        domainErrorCode: error.code,
      },
    }
  },
}
