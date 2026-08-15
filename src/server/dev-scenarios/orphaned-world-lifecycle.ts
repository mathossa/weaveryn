import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type { DevAcceptanceCheck, DevScenario } from '@/dev/scenario-contracts'
import {
  isOrphanedWorldLifecycleAction,
  type OrphanedWorldLifecycleAction,
  type OrphanedWorldLifecycleActor,
  type OrphanedWorldLifecycleScenarioState,
} from '@/dev/scenarios/orphaned-world-lifecycle'
import { prisma } from '@/lib/prisma'
import {
  claimOrphanedWorld,
  cleanupOrphanedWorld,
  relinquishWorldOwnership,
  WorldDomainError,
} from '@/server/worlds'
import { FixtureOwnershipError } from './fixture-safety'
import {
  cleanupWorldFixture,
  upsertFixturePeople,
  type WorldFixtureDefinition,
} from './world-fixture'

const metadata = requireDevScenarioMetadata('orphaned-world-lifecycle')
const WORLD_ID = '13000000-0000-4000-8000-000000000001'
const TIMELINE_ID = '13000000-0000-4000-8000-000000000002'
const CAMPAIGN_ID = '13000000-0000-4000-8000-000000000003'

const PEOPLE = {
  OWNER: '13000000-0000-4000-8000-00000000000a',
  ADMIN: '13000000-0000-4000-8000-00000000000b',
  MEMBER: '13000000-0000-4000-8000-00000000000c',
  VIEWER: '13000000-0000-4000-8000-00000000000d',
  CAMPAIGN_OWNER: '13000000-0000-4000-8000-00000000000e',
  CAMPAIGN_MEMBER: '13000000-0000-4000-8000-00000000000f',
} as const satisfies Record<OrphanedWorldLifecycleActor, string>

const people = Object.entries(PEOPLE).map(([key, id]) => ({
  id,
  email: `dev-orphan-${key.toLowerCase()}@weaveryn.local`,
  username: `orphan-lifecycle-${key.toLowerCase()}`,
  displayName: `${key.replaceAll('_', ' ')} fixture user`,
}))

const fixture: WorldFixtureDefinition = {
  worldId: WORLD_ID,
  worldMarker: metadata.fixtureNamespace,
  people,
}

async function assertFixtureOwned() {
  const [world, campaign, timeline] = await Promise.all([
    prisma.world.findUnique({
      where: { id: WORLD_ID },
      select: { description: true },
    }),
    prisma.campaign.findUnique({
      where: { id: CAMPAIGN_ID },
      select: {
        description: true,
        worldId: true,
        timelineId: true,
        ownerId: true,
      },
    }),
    prisma.worldTimeline.findUnique({
      where: { id: TIMELINE_ID },
      select: { worldId: true },
    }),
  ])
  if (world && world.description !== metadata.fixtureNamespace) {
    throw new FixtureOwnershipError(
      'The orphan lifecycle World is not scenario-owned.',
    )
  }
  if (
    campaign &&
    (campaign.description !== metadata.fixtureNamespace ||
      campaign.worldId !== WORLD_ID ||
      campaign.timelineId !== TIMELINE_ID ||
      campaign.ownerId !== PEOPLE.CAMPAIGN_OWNER)
  ) {
    throw new FixtureOwnershipError(
      'The orphan lifecycle Campaign is not scenario-owned.',
    )
  }
  if (timeline && timeline.worldId !== WORLD_ID) {
    throw new FixtureOwnershipError(
      'The orphan lifecycle timeline is not scenario-owned.',
    )
  }
}

async function readState(): Promise<OrphanedWorldLifecycleScenarioState | null> {
  await assertFixtureOwned()
  const world = await prisma.world.findUnique({
    where: { id: WORLD_ID },
    select: {
      id: true,
      name: true,
      ownerId: true,
      timelines: { where: { id: TIMELINE_ID }, select: { id: true } },
      memberships: {
        select: { userId: true, role: true },
        orderBy: { userId: 'asc' },
      },
      campaigns: {
        select: {
          id: true,
          ownerId: true,
          status: true,
          worldId: true,
          timelineId: true,
          memberships: {
            select: { userId: true, role: true },
            orderBy: { userId: 'asc' },
          },
        },
      },
    },
  })
  if (!world) return null
  return {
    world: {
      id: world.id,
      name: world.name,
      ownerId: world.ownerId,
      timelineId: world.timelines[0]?.id ?? TIMELINE_ID,
    },
    worldMemberships: world.memberships,
    campaigns: world.campaigns,
  }
}

async function resetFixture({
  includeCampaign = true,
  includeSuccessor = true,
}: { includeCampaign?: boolean; includeSuccessor?: boolean } = {}) {
  await prisma.$transaction(async (transaction) => {
    await assertFixtureOwned()
    await transaction.campaign.deleteMany({
      where: { id: CAMPAIGN_ID, description: metadata.fixtureNamespace },
    })
    await transaction.world.deleteMany({
      where: { id: WORLD_ID, description: metadata.fixtureNamespace },
    })
    await upsertFixturePeople(transaction, people)
    await transaction.world.create({
      data: {
        id: WORLD_ID,
        name: 'The Orphaned Observatory',
        description: metadata.fixtureNamespace,
        ownerId: PEOPLE.OWNER,
        timelines: { create: { id: TIMELINE_ID, name: 'Main' } },
        memberships: {
          create: [
            ...(includeSuccessor
              ? [
                  { userId: PEOPLE.ADMIN, role: 'ADMIN' as const },
                  { userId: PEOPLE.MEMBER, role: 'MEMBER' as const },
                ]
              : []),
            { userId: PEOPLE.VIEWER, role: 'VIEWER' },
          ],
        },
      },
    })
    if (includeCampaign) {
      await transaction.campaign.create({
        data: {
          id: CAMPAIGN_ID,
          name: 'Observatory Watch',
          description: metadata.fixtureNamespace,
          ownerId: PEOPLE.CAMPAIGN_OWNER,
          worldId: WORLD_ID,
          timelineId: TIMELINE_ID,
          currentWorldPosition: '0',
          currentWorldDateLabel: '1 Observatory, 1000',
          memberships: {
            create: [
              { userId: PEOPLE.CAMPAIGN_OWNER, role: 'GM' },
              { userId: PEOPLE.CAMPAIGN_MEMBER, role: 'PLAYER' },
            ],
          },
        },
      })
    }
  })
}

async function expectCode(operation: () => Promise<unknown>) {
  try {
    await operation()
    return null
  } catch (error) {
    if (error instanceof WorldDomainError) return error.code
    throw error
  }
}

async function runAll() {
  const checks: DevAcceptanceCheck[] = []

  await resetFixture()
  await relinquishWorldOwnership({ worldId: WORLD_ID, ownerId: PEOPLE.OWNER })
  let state = await readState()
  const relinquished =
    state?.world?.ownerId === null &&
    state.world.timelineId === TIMELINE_ID &&
    state.campaigns[0]?.worldId === WORLD_ID &&
    state.worldMemberships.length === 3
  checks.push({
    id: 'relinquish-preserves-world',
    title: 'Relinquishment preserves the World',
    status: relinquished ? 'passed' : 'failed',
    actor: 'OWNER',
    target: `World ${WORLD_ID}`,
    expected:
      'ownerId null; same timeline, memberships, and active Campaign World link',
    actual: relinquished
      ? 'All preserved'
      : 'Fixture state did not preserve the required references',
    detail: 'Relinquishment changes only the authoritative owner relation.',
  })

  for (const actor of ['ADMIN', 'MEMBER'] as const) {
    await resetFixture()
    await relinquishWorldOwnership({ worldId: WORLD_ID, ownerId: PEOPLE.OWNER })
    await claimOrphanedWorld({ worldId: WORLD_ID, claimantId: PEOPLE[actor] })
    state = await readState()
    const passed =
      state?.world?.ownerId === PEOPLE[actor] &&
      !state.worldMemberships.some(
        (membership) => membership.userId === PEOPLE[actor],
      )
    checks.push({
      id: `claim-${actor.toLowerCase()}`,
      title: `${actor} can claim`,
      status: passed ? 'passed' : 'failed',
      actor,
      target: `World ${WORLD_ID}`,
      expected: 'Claim succeeds and claimant membership is removed',
      actual: passed ? 'Claimed; membership removed' : 'Unexpected claim state',
      detail: 'ADMIN and MEMBER are eligible World successors.',
    })
  }

  await resetFixture()
  await relinquishWorldOwnership({ worldId: WORLD_ID, ownerId: PEOPLE.OWNER })
  const viewerCode = await expectCode(() =>
    claimOrphanedWorld({ worldId: WORLD_ID, claimantId: PEOPLE.VIEWER }),
  )
  const campaignMemberCode = await expectCode(() =>
    claimOrphanedWorld({
      worldId: WORLD_ID,
      claimantId: PEOPLE.CAMPAIGN_MEMBER,
    }),
  )
  checks.push({
    id: 'viewer-and-campaign-member-rejected',
    title: 'VIEWER and Campaign member cannot claim',
    status:
      viewerCode === 'WORLD_OWNERSHIP_CLAIM_FORBIDDEN' &&
      campaignMemberCode === 'WORLD_OWNERSHIP_CLAIM_FORBIDDEN'
        ? 'passed'
        : 'failed',
    actor: 'VIEWER / CAMPAIGN_MEMBER',
    target: `World ${WORLD_ID}`,
    expected: 'Both rejected',
    actual: `${viewerCode ?? 'no error'} / ${campaignMemberCode ?? 'no error'}`,
    domainErrorCode: viewerCode,
    detail: 'Campaign participation does not grant ownership eligibility.',
  })
  await claimOrphanedWorld({
    worldId: WORLD_ID,
    claimantId: PEOPLE.CAMPAIGN_OWNER,
  })
  state = await readState()
  const campaignOwnerClaimed =
    state?.world?.ownerId === PEOPLE.CAMPAIGN_OWNER &&
    state.campaigns[0]?.worldId === WORLD_ID
  checks.push({
    id: 'active-campaign-owner-claim',
    title: 'Active Campaign owner can claim',
    status: campaignOwnerClaimed ? 'passed' : 'failed',
    actor: 'CAMPAIGN_OWNER',
    target: `World ${WORLD_ID}`,
    expected: 'Claim succeeds without changing active Campaign.worldId',
    actual: campaignOwnerClaimed
      ? 'Claimed; Campaign remains linked'
      : 'Unexpected state',
    detail: 'An active Campaign owner is an eligible successor.',
  })

  await resetFixture()
  await relinquishWorldOwnership({ worldId: WORLD_ID, ownerId: PEOPLE.OWNER })
  const activeCleanupCode = await expectCode(() =>
    cleanupOrphanedWorld(WORLD_ID),
  )
  checks.push({
    id: 'active-campaign-blocks-cleanup',
    title: 'Active Campaign blocks cleanup',
    status:
      activeCleanupCode === 'ORPHANED_WORLD_CLEANUP_BLOCKED_BY_ACTIVE_CAMPAIGNS'
        ? 'passed'
        : 'failed',
    actor: 'Lifecycle cleanup',
    target: `World ${WORLD_ID}`,
    expected: 'Cleanup rejected',
    actual: activeCleanupCode ?? 'No error',
    domainErrorCode: activeCleanupCode,
    detail: 'Active Campaigns continue to reference their World.',
  })

  await resetFixture({ includeCampaign: false })
  await relinquishWorldOwnership({ worldId: WORLD_ID, ownerId: PEOPLE.OWNER })
  const successorCleanupCode = await expectCode(() =>
    cleanupOrphanedWorld(WORLD_ID),
  )
  checks.push({
    id: 'successor-blocks-cleanup',
    title: 'Eligible successor blocks cleanup',
    status:
      successorCleanupCode === 'ORPHANED_WORLD_CLEANUP_BLOCKED_BY_SUCCESSOR'
        ? 'passed'
        : 'failed',
    actor: 'Lifecycle cleanup',
    target: `World ${WORLD_ID}`,
    expected: 'Cleanup rejected while ADMIN or MEMBER remains',
    actual: successorCleanupCode ?? 'No error',
    domainErrorCode: successorCleanupCode,
    detail: 'An eligible successor must be allowed to claim first.',
  })

  await resetFixture({ includeCampaign: false, includeSuccessor: false })
  await relinquishWorldOwnership({ worldId: WORLD_ID, ownerId: PEOPLE.OWNER })
  await cleanupOrphanedWorld(WORLD_ID)
  const removed = (await readState()) === null
  checks.push({
    id: 'cleanup-no-successor',
    title: 'Cleanup removes a safe orphan',
    status: removed ? 'passed' : 'failed',
    actor: 'Lifecycle cleanup',
    target: `World ${WORLD_ID}`,
    expected: 'No active Campaign and no eligible successor',
    actual: removed ? 'World removed' : 'World remains',
    detail:
      'Cleanup is allowed only when no successor or protected Campaign reference remains.',
  })

  return checks
}

export const orphanedWorldLifecycleScenario: DevScenario<
  OrphanedWorldLifecycleScenarioState,
  OrphanedWorldLifecycleAction
> = {
  metadata,
  readState,
  async reset() {
    await resetFixture()
    return {
      ok: true,
      message:
        'Created the owner, successors, active Campaign, and Campaign member fixture.',
    }
  },
  async cleanup() {
    const cleanup = await prisma.$transaction(async (transaction) => {
      await assertFixtureOwned()
      await transaction.campaign.deleteMany({
        where: { id: CAMPAIGN_ID, description: metadata.fixtureNamespace },
      })
      return cleanupWorldFixture(transaction, fixture)
    })
    return {
      ok: true,
      message: 'Removed orphan lifecycle scenario data.',
      cleanup,
    }
  },
  async runAll() {
    const checks = await runAll()
    const passed = checks.filter((check) => check.status === 'passed').length
    return {
      ok: passed === checks.length,
      message: `${passed}/${checks.length} live acceptance checks passed.`,
      checks,
    }
  },
  isAction: isOrphanedWorldLifecycleAction,
  async execute(request) {
    if (request.action === 'relinquish')
      await relinquishWorldOwnership({
        worldId: WORLD_ID,
        ownerId: PEOPLE.OWNER,
      })
    if (request.action === 'claim')
      await claimOrphanedWorld({
        worldId: WORLD_ID,
        claimantId: PEOPLE[request.actor],
      })
    if (request.action === 'cleanup') await cleanupOrphanedWorld(WORLD_ID)
    return {
      ok: true,
      message: `Completed ${request.action} through the World lifecycle service.`,
    }
  },
  mapError(error) {
    if (error instanceof WorldDomainError)
      return { code: error.code, message: error.message, status: 409 }
    if (error instanceof FixtureOwnershipError)
      return { code: error.code, message: error.message, status: 409 }
    return null
  },
}
