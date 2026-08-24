import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type { DevAcceptanceCheck, DevScenario } from '@/dev/scenario-contracts'
import {
  isCampaignFoundationAction,
  type CampaignCreateActor,
  type CampaignFoundationAction,
  type CampaignFoundationState,
} from '@/dev/scenarios/campaign-foundation'
import { prisma } from '@/lib/prisma'
import {
  CampaignDomainError,
  campaignContextService,
  campaignMembershipService,
  CampaignService,
  campaignService,
  getCampaignNowContext,
  PrismaCampaignRepository,
} from '@/server/campaigns'
import { MAIN_WORLD_TIMELINE_NAME } from '@/server/worlds'
import { worldEntityService } from '@/server/world-entities'
import { FixtureOwnershipError } from './fixture-safety'
import {
  assertWorldFixtureOwned,
  cleanupWorldFixture,
  upsertFixturePeople,
  type WorldFixtureDefinition,
} from './world-fixture'

const metadata = requireDevScenarioMetadata('campaign-foundation')
const WORLD_ID = '15000000-0000-4000-8000-000000000001'
const TIMELINE_ID = '15000000-0000-4000-8000-000000000002'
const ADMIN_MEMBERSHIP_ID = '15000000-0000-4000-8000-000000000003'
const MEMBER_MEMBERSHIP_ID = '15000000-0000-4000-8000-000000000004'
const WORLD_OWNER_ID = '15000000-0000-4000-8000-00000000000a'
const WORLD_ADMIN_ID = '15000000-0000-4000-8000-00000000000b'
const WORLD_MEMBER_ID = '15000000-0000-4000-8000-00000000000c'
const OWNER_CAMPAIGN_ID = '15000000-0000-4000-8000-000000000010'
const ADMIN_CAMPAIGN_ID = '15000000-0000-4000-8000-000000000011'
const MEMBER_CAMPAIGN_ID = '15000000-0000-4000-8000-000000000012'
const CHARACTER_ID = '15000000-0000-4000-8000-000000000020'
const WORLD_CHARACTER_ID = '15000000-0000-4000-8000-000000000021'
const CAMPAIGN_CHARACTER_ID = '15000000-0000-4000-8000-000000000022'
const CHARACTER_NAME = 'Marun (Campaign lifecycle fixture)'
const WORLD_NAME = 'Aldorath Campaign Laboratory'
const OWNER_CAMPAIGN_NAME = 'The Crownless Road'
const ADMIN_CAMPAIGN_NAME = 'Ashes of Aldorath'
const UPDATED_ADMIN_CAMPAIGN_NAME = 'Ashes of Aldorath: Aftermath'
const INITIAL_POSITION = '142.5'
const INITIAL_DATE_LABEL = '14 Emberwane, 812'
const UPDATED_POSITION = '148'
const UPDATED_DATE_LABEL = '20 Emberwane, 812'

const campaignIds = [
  OWNER_CAMPAIGN_ID,
  ADMIN_CAMPAIGN_ID,
  MEMBER_CAMPAIGN_ID,
] as const

const fixture: WorldFixtureDefinition = {
  worldId: WORLD_ID,
  worldMarker: metadata.fixtureNamespace,
  people: [
    {
      id: WORLD_OWNER_ID,
      email: 'dev-campaign-world-owner@weaveryn.local',
      username: 'campaign-lab-world-owner',
      displayName: 'Wren (World owner)',
    },
    {
      id: WORLD_ADMIN_ID,
      email: 'dev-campaign-world-admin@weaveryn.local',
      username: 'campaign-lab-world-admin',
      displayName: 'Ada (World Admin)',
    },
    {
      id: WORLD_MEMBER_ID,
      email: 'dev-campaign-world-member@weaveryn.local',
      username: 'campaign-lab-world-member',
      displayName: 'Mira (World Member)',
    },
  ],
}

function actorDetails(actor: CampaignCreateActor) {
  if (actor === 'WORLD_OWNER') {
    return {
      id: WORLD_OWNER_ID,
      name: 'Wren (World owner)',
      campaignId: OWNER_CAMPAIGN_ID,
      campaignName: OWNER_CAMPAIGN_NAME,
    }
  }

  if (actor === 'WORLD_ADMIN') {
    return {
      id: WORLD_ADMIN_ID,
      name: 'Ada (World Admin)',
      campaignId: ADMIN_CAMPAIGN_ID,
      campaignName: ADMIN_CAMPAIGN_NAME,
    }
  }

  return {
    id: WORLD_MEMBER_ID,
    name: 'Mira (World Member)',
    campaignId: MEMBER_CAMPAIGN_ID,
    campaignName: "The Threadwalker's Tale",
  }
}

function campaignOwnerMatchesFixture(campaignId: string, ownerId: string) {
  if (campaignId === OWNER_CAMPAIGN_ID) return ownerId === WORLD_OWNER_ID
  if (campaignId === MEMBER_CAMPAIGN_ID) return ownerId === WORLD_MEMBER_ID
  if (campaignId === ADMIN_CAMPAIGN_ID) {
    return ownerId === WORLD_ADMIN_ID || ownerId === WORLD_MEMBER_ID
  }
  return false
}

async function assertCampaignFixturesOwned(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
) {
  const campaigns = await transaction.campaign.findMany({
    where: { id: { in: [...campaignIds] } },
    select: {
      id: true,
      description: true,
      worldId: true,
      ownerId: true,
    },
  })

  for (const campaign of campaigns) {
    if (
      campaign.description !== metadata.fixtureNamespace ||
      campaign.worldId !== WORLD_ID ||
      !campaignOwnerMatchesFixture(campaign.id, campaign.ownerId)
    ) {
      throw new FixtureOwnershipError(
        `Campaign ${campaign.id} is not owned by this development scenario.`,
      )
    }
  }
}

async function deleteCampaignFixtures(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
) {
  await assertCampaignFixturesOwned(transaction)
  return transaction.campaign.deleteMany({
    where: {
      id: { in: [...campaignIds] },
      worldId: WORLD_ID,
      description: metadata.fixtureNamespace,
    },
  })
}

async function deleteCharacterFixture(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
) {
  const [character, worldCharacter] = await Promise.all([
    transaction.character.findUnique({
      where: { id: CHARACTER_ID },
      select: { ownerUserId: true, name: true },
    }),
    transaction.worldCharacter.findUnique({
      where: { id: WORLD_CHARACTER_ID },
      select: { characterId: true, worldId: true },
    }),
  ])
  if (
    character &&
    (character.ownerUserId !== WORLD_MEMBER_ID ||
      character.name !== CHARACTER_NAME)
  ) {
    throw new FixtureOwnershipError(
      `Character ${CHARACTER_ID} is not owned by this development scenario.`,
    )
  }
  if (
    worldCharacter &&
    (worldCharacter.characterId !== CHARACTER_ID ||
      worldCharacter.worldId !== WORLD_ID)
  ) {
    throw new FixtureOwnershipError(
      `WorldCharacter ${WORLD_CHARACTER_ID} is not owned by this development scenario.`,
    )
  }
  await transaction.worldCharacter.deleteMany({
    where: {
      id: WORLD_CHARACTER_ID,
      characterId: CHARACTER_ID,
      worldId: WORLD_ID,
    },
  })
  await transaction.character.deleteMany({
    where: {
      id: CHARACTER_ID,
      ownerUserId: WORLD_MEMBER_ID,
      name: CHARACTER_NAME,
    },
  })
}
async function readState(): Promise<CampaignFoundationState | null> {
  const [world, timeline, people, memberships, campaigns] = await Promise.all([
    prisma.world.findUnique({
      where: { id: WORLD_ID },
      select: { id: true, name: true, description: true, ownerId: true },
    }),
    prisma.worldTimeline.findUnique({
      where: { id: TIMELINE_ID },
      select: { id: true, worldId: true, name: true },
    }),
    prisma.user.findMany({
      where: { id: { in: fixture.people.map((person) => person.id) } },
      select: { id: true, displayName: true },
      orderBy: { id: 'asc' },
    }),
    prisma.worldMembership.findMany({
      where: { worldId: WORLD_ID },
      select: { userId: true, role: true },
    }),
    prisma.campaign.findMany({
      where: { id: { in: [...campaignIds] } },
      include: {
        memberships: {
          select: { userId: true, role: true },
          orderBy: { userId: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    }),
  ])

  if (!world) return null

  if (world.description !== metadata.fixtureNamespace) {
    throw new FixtureOwnershipError(
      `World ${WORLD_ID} is not owned by this development scenario.`,
    )
  }

  if (
    timeline?.worldId !== WORLD_ID ||
    timeline.name !== MAIN_WORLD_TIMELINE_NAME
  ) {
    throw new FixtureOwnershipError(
      `Timeline ${TIMELINE_ID} is not owned by this development scenario.`,
    )
  }

  for (const campaign of campaigns) {
    if (
      campaign.description !== metadata.fixtureNamespace ||
      campaign.worldId !== WORLD_ID ||
      !campaignOwnerMatchesFixture(campaign.id, campaign.ownerId)
    ) {
      throw new FixtureOwnershipError(
        `Campaign ${campaign.id} is not owned by this development scenario.`,
      )
    }
  }

  const roles = new Map(memberships.map(({ userId, role }) => [userId, role]))

  return {
    world: {
      id: world.id,
      name: world.name,
      ownerId: world.ownerId,
    },
    timeline,
    people: people.map((person) => ({
      ...person,
      worldRole:
        person.id === WORLD_OWNER_ID
          ? ('OWNER' as const)
          : roles.get(person.id) === 'ADMIN'
            ? ('ADMIN' as const)
            : ('MEMBER' as const),
    })),
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      worldId: campaign.worldId,
      ownerId: campaign.ownerId,
      timelineId: campaign.timelineId,
      currentWorldPosition: campaign.currentWorldPosition?.toString() ?? null,
      currentWorldDateLabel: campaign.currentWorldDateLabel,
      currentLocationId: campaign.currentLocationId,
      memberships: campaign.memberships,
      currentFocus: campaign.currentFocus,
      status: campaign.status,
    })),
  }
}

async function resetFixture() {
  await prisma.$transaction(async (transaction) => {
    await deleteCampaignFixtures(transaction)
    await deleteCharacterFixture(transaction)
    await assertWorldFixtureOwned(transaction, fixture)
    await transaction.world.deleteMany({
      where: { id: WORLD_ID, description: metadata.fixtureNamespace },
    })
    await upsertFixturePeople(transaction, fixture.people)
    await transaction.world.create({
      data: {
        id: WORLD_ID,
        name: WORLD_NAME,
        description: metadata.fixtureNamespace,
        ownerId: WORLD_OWNER_ID,
        timelines: {
          create: {
            id: TIMELINE_ID,
            name: MAIN_WORLD_TIMELINE_NAME,
          },
        },
        memberships: {
          create: [
            {
              id: ADMIN_MEMBERSHIP_ID,
              userId: WORLD_ADMIN_ID,
              role: 'ADMIN',
            },
            {
              id: MEMBER_MEMBERSHIP_ID,
              userId: WORLD_MEMBER_ID,
              role: 'MEMBER',
            },
          ],
        },
      },
    })
  })
}

async function createCampaignFor(actor: CampaignCreateActor) {
  const details = actorDetails(actor)
  const service = new CampaignService(
    new PrismaCampaignRepository(prisma),
    () => details.campaignId,
  )

  return service.createCampaign({
    creatorId: details.id,
    worldId: WORLD_ID,
    name: details.campaignName,
    description: metadata.fixtureNamespace,
    currentWorldPosition: INITIAL_POSITION,
    currentWorldDateLabel: INITIAL_DATE_LABEL,
  })
}

async function runAcceptanceChecks() {
  const checks: DevAcceptanceCheck[] = []

  await resetFixture()
  const ownerCampaign = await createCampaignFor('WORLD_OWNER')
  const ownerCreationPassed =
    ownerCampaign.worldId === WORLD_ID &&
    ownerCampaign.ownerId === WORLD_OWNER_ID &&
    ownerCampaign.timelineId === TIMELINE_ID &&
    ownerCampaign.status === 'ACTIVE'
  checks.push({
    id: 'world-owner-create',
    title: 'World owner creates an active Campaign',
    status: ownerCreationPassed ? 'passed' : 'failed',
    actor: 'Wren (World owner)',
    target: WORLD_NAME,
    expected: 'ACTIVE Campaign on the World main timeline',
    actual: `${ownerCampaign.status}; owner ${ownerCampaign.ownerId}; timeline ${ownerCampaign.timelineId}`,
    detail: ownerCreationPassed
      ? 'The real service persisted the World, owner, timeline, and active temporal context.'
      : 'One or more required Campaign relationships were incorrect.',
  })

  await resetFixture()
  const adminCampaign = await createCampaignFor('WORLD_ADMIN')
  const adminCreationPassed =
    adminCampaign.ownerId === WORLD_ADMIN_ID &&
    adminCampaign.worldId === WORLD_ID
  checks.push({
    id: 'world-admin-create',
    title: 'World Admin creates and independently owns a Campaign',
    status: adminCreationPassed ? 'passed' : 'failed',
    actor: 'Ada (World Admin)',
    target: WORLD_NAME,
    expected: `Campaign owner ${WORLD_ADMIN_ID}, distinct from World owner`,
    actual: `Campaign owner ${adminCampaign.ownerId}; World owner ${WORLD_OWNER_ID}`,
    detail: adminCreationPassed
      ? 'World permission authorized creation without transferring Campaign authority to the World owner.'
      : 'Campaign ownership did not remain independent from World ownership.',
  })

  await resetFixture()
  const memberCampaign = await createCampaignFor('WORLD_MEMBER')
  const memberCreationPassed =
    memberCampaign.ownerId === WORLD_MEMBER_ID &&
    memberCampaign.worldId === WORLD_ID &&
    memberCampaign.status === 'ACTIVE'
  checks.push({
    id: 'world-member-create',
    title:
      'World Member (Threadwalker) creates and independently owns a Campaign',
    status: memberCreationPassed ? 'passed' : 'failed',
    actor: 'Mira (World Member / Threadwalker)',
    target: WORLD_NAME,
    expected: `ACTIVE Campaign owned by ${WORLD_MEMBER_ID}`,
    actual: `${memberCampaign.status}; owner ${memberCampaign.ownerId}`,
    detail: memberCreationPassed
      ? 'The real Campaign service grants Threadwalkers creation permission while keeping Campaign ownership independent.'
      : 'The Campaign was not created with the expected independent ownership.',
  })

  await resetFixture()
  const loadTarget = await createCampaignFor('WORLD_ADMIN')
  const [ownerLoad, ownerList, worldOwnerLoad] = await Promise.all([
    campaignService.loadCampaign(loadTarget.id, WORLD_ADMIN_ID),
    campaignService.listCampaigns(WORLD_ADMIN_ID),
    campaignService.loadCampaign(loadTarget.id, WORLD_OWNER_ID),
  ])
  const loadingPassed =
    ownerLoad?.id === loadTarget.id &&
    ownerList.some((campaign) => campaign.id === loadTarget.id) &&
    worldOwnerLoad === null
  checks.push({
    id: 'owner-load-list',
    title: 'Campaign owner can load and list the Campaign',
    status: loadingPassed ? 'passed' : 'failed',
    actor: 'Ada (Campaign owner)',
    target: ADMIN_CAMPAIGN_NAME,
    expected:
      'Owner sees Campaign; World owner does not inherit Campaign access',
    actual: `owner load ${ownerLoad ? 'found' : 'missing'}; owner list ${ownerList.length}; World owner load ${worldOwnerLoad ? 'found' : 'not found'}`,
    detail: loadingPassed
      ? 'The owner-only access path works pending Campaign memberships in issue #16.'
      : 'The Campaign visibility boundary differed from the issue #15 scope.',
  })

  await resetFixture()
  const updateTarget = await createCampaignFor('WORLD_ADMIN')
  const updated = await campaignService.updateCampaign(
    updateTarget.id,
    WORLD_ADMIN_ID,
    {
      name: UPDATED_ADMIN_CAMPAIGN_NAME,
      currentWorldPosition: UPDATED_POSITION,
      currentWorldDateLabel: UPDATED_DATE_LABEL,
    },
  )
  const ownerUpdatePassed =
    updated.name === UPDATED_ADMIN_CAMPAIGN_NAME &&
    updated.currentWorldPosition === UPDATED_POSITION &&
    updated.currentWorldDateLabel === UPDATED_DATE_LABEL &&
    updated.ownerId === WORLD_ADMIN_ID &&
    updated.worldId === WORLD_ID &&
    updated.timelineId === TIMELINE_ID
  checks.push({
    id: 'campaign-owner-update',
    title: 'Campaign owner updates basic and temporal state',
    status: ownerUpdatePassed ? 'passed' : 'failed',
    actor: 'Ada (Campaign owner)',
    target: ADMIN_CAMPAIGN_NAME,
    expected: `${UPDATED_ADMIN_CAMPAIGN_NAME} at ${UPDATED_DATE_LABEL}`,
    actual: `${updated.name} at ${updated.currentWorldDateLabel}`,
    detail: ownerUpdatePassed
      ? 'Editable fields changed while World, timeline, and ownership remained invariant.'
      : 'The persisted update or an invariant differed from the expectation.',
  })

  await resetFixture()
  const protectedTarget = await createCampaignFor('WORLD_ADMIN')
  let updateErrorCode: string | null = null
  try {
    await campaignService.updateCampaign(protectedTarget.id, WORLD_OWNER_ID, {
      name: 'World owner takeover',
    })
  } catch (error) {
    if (
      error instanceof CampaignDomainError &&
      error.code === 'CAMPAIGN_UPDATE_FORBIDDEN'
    ) {
      updateErrorCode = error.code
    } else {
      throw error
    }
  }
  const afterRejectedUpdate = await readState()
  const persistedProtected = afterRejectedUpdate?.campaigns.find(
    (campaign) => campaign.id === ADMIN_CAMPAIGN_ID,
  )
  const independentAuthorityPassed =
    updateErrorCode === 'CAMPAIGN_UPDATE_FORBIDDEN' &&
    persistedProtected?.name === ADMIN_CAMPAIGN_NAME
  checks.push({
    id: 'world-owner-update-denied',
    title: 'World owner cannot update another owner’s Campaign',
    status: independentAuthorityPassed ? 'passed' : 'failed',
    actor: 'Wren (World owner)',
    target: ADMIN_CAMPAIGN_NAME,
    expected: 'CAMPAIGN_UPDATE_FORBIDDEN and unchanged Campaign',
    actual: `${updateErrorCode ?? 'no domain error'}; ${persistedProtected?.name ?? 'Campaign missing'}`,
    domainErrorCode: updateErrorCode,
    detail: independentAuthorityPassed
      ? 'The independent Campaign ownership boundary rejected World-level authority.'
      : 'The rejection or persisted Campaign state differed from the expectation.',
  })

  await resetFixture()
  const contextCampaign = await createCampaignFor('WORLD_ADMIN')
  await campaignMembershipService.addMember({
    actorUserId: WORLD_ADMIN_ID,
    campaignId: contextCampaign.id,
    userId: WORLD_MEMBER_ID,
    role: 'PLAYER',
  })
  const capablePlayer = await campaignMembershipService.setMemberCapability({
    actorUserId: WORLD_ADMIN_ID,
    campaignId: contextCampaign.id,
    userId: WORLD_MEMBER_ID,
    capability: 'UPDATE_CURRENT_LOCATION',
    enabled: true,
  })
  const visibleLocation = await worldEntityService.createEntity({
    actorUserId: WORLD_ADMIN_ID,
    worldId: WORLD_ID,
    type: 'location',
    name: 'The Ember Gate',
    data: { scenario: metadata.fixtureNamespace },
    contextCampaignId: contextCampaign.id,
    visibility: { scope: 'CAMPAIGN', campaignId: contextCampaign.id },
  })
  const visiblePerson = await worldEntityService.createEntity({
    actorUserId: WORLD_ADMIN_ID,
    worldId: WORLD_ID,
    type: 'person',
    name: 'Mara of the Watch',
    data: { scenario: metadata.fixtureNamespace },
    contextCampaignId: contextCampaign.id,
    visibility: { scope: 'CAMPAIGN', campaignId: contextCampaign.id },
  })
  await worldEntityService.createRelationship({
    actorUserId: WORLD_ADMIN_ID,
    worldId: WORLD_ID,
    sourceEntityId: visibleLocation.id,
    targetEntityId: visiblePerson.id,
    relationshipType: 'guards',
    label: 'Keeping watch nearby',
    contextCampaignId: contextCampaign.id,
    visibility: { scope: 'CAMPAIGN', campaignId: contextCampaign.id },
  })
  await campaignContextService.update(contextCampaign.id, WORLD_MEMBER_ID, {
    currentLocationId: visibleLocation.id,
  })
  await campaignContextService.update(contextCampaign.id, WORLD_ADMIN_ID, {
    currentFocus: 'Find a safe road beyond the gate.',
  })
  const visiblePlayerNow = await getCampaignNowContext(
    WORLD_ID,
    contextCampaign.id,
    WORLD_MEMBER_ID,
  )
  const hiddenLocation = await worldEntityService.createEntity({
    actorUserId: WORLD_ADMIN_ID,
    worldId: WORLD_ID,
    type: 'location',
    name: 'The Unrevealed Vault',
    data: { scenario: metadata.fixtureNamespace },
    contextCampaignId: contextCampaign.id,
    visibility: { scope: 'GM', campaignId: contextCampaign.id },
  })
  await campaignContextService.update(contextCampaign.id, WORLD_ADMIN_ID, {
    currentLocationId: hiddenLocation.id,
  })
  const hiddenPlayerNow = await getCampaignNowContext(
    WORLD_ID,
    contextCampaign.id,
    WORLD_MEMBER_ID,
  )
  const campaignContextPassed =
    capablePlayer.capabilities.includes('UPDATE_CURRENT_LOCATION') &&
    visiblePlayerNow?.currentLocation?.id === visibleLocation.id &&
    visiblePlayerNow.aroundYou.some((entry) => entry.id === visiblePerson.id) &&
    visiblePlayerNow.campaign.currentFocus ===
      'Find a safe road beyond the gate.' &&
    hiddenPlayerNow?.currentLocation === null &&
    hiddenPlayerNow.aroundYou.length === 0
  checks.push({
    id: 'living-world-campaign-context',
    title: 'Campaign Now enforces capability and entity visibility boundaries',
    status: campaignContextPassed ? 'passed' : 'failed',
    actor: 'Mira (capable Threadwalker) and Ada (Campaign owner)',
    target: ADMIN_CAMPAIGN_NAME,
    expected:
      'Visible Location and Around You resolve; GM-only Current Location does not leak',
    actual: `capability ${capablePlayer.capabilities.join(', ') || 'none'}; visible location ${visiblePlayerNow?.currentLocation?.name ?? 'none'}; around ${visiblePlayerNow?.aroundYou.length ?? 0}; hidden player location ${hiddenPlayerNow?.currentLocation?.name ?? 'none'}`,
    detail: campaignContextPassed
      ? 'Real membership, context, entity, relationship, and visibility services preserve the Campaign Now boundary.'
      : 'One or more Campaign context, capability, or visibility expectations differed.',
  })

  await resetFixture()
  const transferTarget = await createCampaignFor('WORLD_ADMIN')
  await campaignMembershipService.addMember({
    actorUserId: WORLD_ADMIN_ID,
    campaignId: transferTarget.id,
    userId: WORLD_MEMBER_ID,
    role: 'PLAYER',
  })
  const transferred = await campaignService.transferOwnership({
    campaignId: transferTarget.id,
    worldId: WORLD_ID,
    actorUserId: WORLD_ADMIN_ID,
    targetUserId: WORLD_MEMBER_ID,
  })
  const transferredMembership =
    await prisma.campaignMembership.findUniqueOrThrow({
      where: {
        campaignId_userId: {
          campaignId: transferTarget.id,
          userId: WORLD_MEMBER_ID,
        },
      },
    })
  const transferPassed =
    transferred.ownerId === WORLD_MEMBER_ID &&
    transferredMembership.role === 'GM' &&
    transferredMembership.capabilities.length === 0
  checks.push({
    id: 'campaign-owner-transfer',
    title: 'Campaign owner transfers authority and the target becomes GM',
    status: transferPassed ? 'passed' : 'failed',
    actor: 'Ada (Campaign owner)',
    target: 'Mira (existing Threadwalker)',
    expected: `owner ${WORLD_MEMBER_ID}; GM membership`,
    actual: `owner ${transferred.ownerId}; role ${transferredMembership.role}`,
    detail: transferPassed
      ? 'The production transfer service atomically updated authoritative ownership and normalized Campaign participation.'
      : 'Ownership or target membership did not match the transfer contract.',
  })

  await resetFixture()
  const protectedLifecycle = await createCampaignFor('WORLD_ADMIN')
  let worldOwnerTransferError: string | null = null
  let nonOwnerLifecycleError: string | null = null
  try {
    await campaignService.transferOwnership({
      campaignId: protectedLifecycle.id,
      worldId: WORLD_ID,
      actorUserId: WORLD_OWNER_ID,
      targetUserId: WORLD_MEMBER_ID,
    })
  } catch (error) {
    if (error instanceof CampaignDomainError) {
      worldOwnerTransferError = error.code
    } else {
      throw error
    }
  }
  try {
    await campaignService.endCampaign({
      campaignId: protectedLifecycle.id,
      worldId: WORLD_ID,
      actorUserId: WORLD_MEMBER_ID,
    })
  } catch (error) {
    if (error instanceof CampaignDomainError) {
      nonOwnerLifecycleError = error.code
    } else {
      throw error
    }
  }
  const protectedAfterRejections = await prisma.campaign.findUniqueOrThrow({
    where: { id: protectedLifecycle.id },
  })
  const rejectionPassed =
    worldOwnerTransferError === 'CAMPAIGN_OWNERSHIP_TRANSFER_FORBIDDEN' &&
    nonOwnerLifecycleError === 'CAMPAIGN_LIFECYCLE_FORBIDDEN' &&
    protectedAfterRejections.ownerId === WORLD_ADMIN_ID &&
    protectedAfterRejections.status === 'ACTIVE'
  checks.push({
    id: 'campaign-lifecycle-authority',
    title:
      'World authority and ordinary membership do not grant lifecycle authority',
    status: rejectionPassed ? 'passed' : 'failed',
    actor: 'Wren (World owner) and Mira (non-owner)',
    target: ADMIN_CAMPAIGN_NAME,
    expected:
      'CAMPAIGN_OWNERSHIP_TRANSFER_FORBIDDEN and CAMPAIGN_LIFECYCLE_FORBIDDEN',
    actual: `${worldOwnerTransferError ?? 'no transfer error'}; ${nonOwnerLifecycleError ?? 'no lifecycle error'}`,
    domainErrorCode: worldOwnerTransferError,
    detail: rejectionPassed
      ? 'Both requests were rejected and the active Campaign remained owned by Ada.'
      : 'One authorization boundary or persisted field differed.',
  })

  await resetFixture()
  const archiveTarget = await createCampaignFor('WORLD_ADMIN')
  await campaignMembershipService.addMember({
    actorUserId: WORLD_ADMIN_ID,
    campaignId: archiveTarget.id,
    userId: WORLD_MEMBER_ID,
    role: 'PLAYER',
  })
  const ended = await campaignService.endCampaign({
    campaignId: archiveTarget.id,
    worldId: WORLD_ID,
    actorUserId: WORLD_ADMIN_ID,
  })
  const archived = await campaignService.archiveCampaign({
    campaignId: archiveTarget.id,
    worldId: WORLD_ID,
    actorUserId: WORLD_ADMIN_ID,
  })
  let archivedEditError: string | null = null
  try {
    await campaignService.updateCampaign(archiveTarget.id, WORLD_ADMIN_ID, {
      name: 'Mutated archive',
    })
  } catch (error) {
    if (error instanceof CampaignDomainError) {
      archivedEditError = error.code
    } else {
      throw error
    }
  }
  const archivedPersisted = await prisma.campaign.findUniqueOrThrow({
    where: { id: archiveTarget.id },
    include: { memberships: true },
  })
  const archivePassed =
    ended.status === 'ENDED' &&
    archived.status === 'ARCHIVED' &&
    archivedPersisted.status === 'ARCHIVED' &&
    archivedPersisted.worldId === WORLD_ID &&
    archivedPersisted.timelineId === TIMELINE_ID &&
    archivedPersisted.memberships.length === 2 &&
    archivedEditError === 'CAMPAIGN_UPDATE_FORBIDDEN'
  checks.push({
    id: 'campaign-end-archive-persistence',
    title: 'Owner ends and archives without losing historical Campaign state',
    status: archivePassed ? 'passed' : 'failed',
    actor: 'Ada (Campaign owner)',
    target: ADMIN_CAMPAIGN_NAME,
    expected:
      'ACTIVE → ENDED → ARCHIVED; attached data preserved; edits rejected',
    actual: `${ended.status} → ${archived.status}; ${archivedPersisted.memberships.length} memberships; ${archivedEditError ?? 'edit allowed'}`,
    domainErrorCode: archivedEditError,
    detail: archivePassed
      ? 'Archival preserved World/timeline context and memberships while making normal edits read-only.'
      : 'The lifecycle transition, persistence, or read-only guard differed.',
  })

  await resetFixture()
  const deleteTarget = await createCampaignFor('WORLD_ADMIN')
  await prisma.character.create({
    data: {
      id: CHARACTER_ID,
      ownerUserId: WORLD_MEMBER_ID,
      name: CHARACTER_NAME,
    },
  })
  await prisma.worldCharacter.create({
    data: {
      id: WORLD_CHARACTER_ID,
      characterId: CHARACTER_ID,
      worldId: WORLD_ID,
    },
  })
  await prisma.campaignCharacter.create({
    data: {
      id: CAMPAIGN_CHARACTER_ID,
      worldCharacterId: WORLD_CHARACTER_ID,
      campaignId: deleteTarget.id,
      sheetData: { scenario: metadata.fixtureNamespace },
    },
  })
  await campaignService.deleteCampaign({
    campaignId: deleteTarget.id,
    worldId: WORLD_ID,
    actorUserId: WORLD_ADMIN_ID,
  })
  const [
    deletedCampaign,
    deletedParticipation,
    portableCharacter,
    worldCharacter,
    preservedWorld,
  ] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: deleteTarget.id } }),
    prisma.campaignCharacter.findUnique({
      where: { id: CAMPAIGN_CHARACTER_ID },
    }),
    prisma.character.findUnique({ where: { id: CHARACTER_ID } }),
    prisma.worldCharacter.findUnique({ where: { id: WORLD_CHARACTER_ID } }),
    prisma.world.findUnique({ where: { id: WORLD_ID } }),
  ])
  const deletionPassed =
    deletedCampaign === null &&
    deletedParticipation === null &&
    portableCharacter !== null &&
    worldCharacter !== null &&
    preservedWorld !== null
  checks.push({
    id: 'campaign-delete-preserves-character-identity',
    title:
      'Campaign deletion removes participation but preserves Character identities',
    status: deletionPassed ? 'passed' : 'failed',
    actor: 'Ada (Campaign owner)',
    target: ADMIN_CAMPAIGN_NAME,
    expected:
      'Campaign and CampaignCharacter deleted; Character, WorldCharacter, and World preserved',
    actual: `Campaign ${deletedCampaign ? 'present' : 'deleted'}; participation ${deletedParticipation ? 'present' : 'deleted'}; Character ${portableCharacter ? 'preserved' : 'missing'}; WorldCharacter ${worldCharacter ? 'preserved' : 'missing'}`,
    detail: deletionPassed
      ? 'The production delete service removed only Campaign-scoped records.'
      : 'A portable or World-scoped identity did not survive deletion.',
  })
  await prisma.$transaction(deleteCharacterFixture)
  return checks
}

export const campaignFoundationScenario: DevScenario<
  CampaignFoundationState,
  CampaignFoundationAction
> = {
  metadata,
  readState,
  async reset() {
    await resetFixture()
    return {
      ok: true,
      message: 'Created the deterministic Campaign foundation fixture.',
      activity: {
        action: 'reset',
        actor: 'Development fixture runner',
        target: WORLD_NAME,
        expected:
          'World, main timeline, owner, Admin, Member, and no Campaigns',
        actual: 'Fixture restored with no Campaigns',
        status: 'passed',
      },
    }
  },
  async cleanup() {
    const cleanup = await prisma.$transaction(async (transaction) => {
      const campaignDeletion = await deleteCampaignFixtures(transaction)
      await deleteCharacterFixture(transaction)
      const summary = await cleanupWorldFixture(transaction, fixture)

      if (campaignDeletion.count > 0) {
        summary.deleted.unshift(
          `${campaignDeletion.count} Campaign foundation fixture Campaign(s)`,
        )
      }

      return summary
    })

    return {
      ok: true,
      message: cleanup.retained.length
        ? 'Scenario data was cleaned; referenced fixture users were intentionally retained.'
        : 'All disposable Campaign foundation scenario data was removed.',
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
      message: `${passed}/${checks.length} Campaign foundation checks passed.`,
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
  isAction: isCampaignFoundationAction,
  async execute(request) {
    if (request.action === 'create-campaign') {
      const details = actorDetails(request.actor)
      const campaign = await createCampaignFor(request.actor)
      return {
        ok: true,
        message: `${details.name} created a Campaign through the production service.`,
        activity: {
          action: request.action,
          actor: details.name,
          target: WORLD_NAME,
          expected: `${details.campaignName}, owned by ${details.id}`,
          actual: `${campaign.name}, owned by ${campaign.ownerId}`,
          status: campaign.ownerId === details.id ? 'passed' : 'failed',
        },
      }
    }

    if (request.action === 'update-admin-campaign') {
      const actorId =
        request.actor === 'CAMPAIGN_OWNER' ? WORLD_ADMIN_ID : WORLD_OWNER_ID
      const actorName =
        request.actor === 'CAMPAIGN_OWNER'
          ? 'Ada (Campaign owner and World Admin)'
          : 'Wren (World owner)'
      const campaign = await campaignService.updateCampaign(
        ADMIN_CAMPAIGN_ID,
        actorId,
        {
          name: UPDATED_ADMIN_CAMPAIGN_NAME,
          currentWorldPosition: UPDATED_POSITION,
          currentWorldDateLabel: UPDATED_DATE_LABEL,
        },
      )

      return {
        ok: true,
        message: `${actorName} updated the Campaign through the production service.`,
        activity: {
          action: request.action,
          actor: actorName,
          target: ADMIN_CAMPAIGN_NAME,
          expected: UPDATED_ADMIN_CAMPAIGN_NAME,
          actual: campaign.name,
          status:
            campaign.name === UPDATED_ADMIN_CAMPAIGN_NAME ? 'passed' : 'failed',
        },
      }
    }

    const current = await prisma.campaign.findUnique({
      where: { id: ADMIN_CAMPAIGN_ID },
      select: { ownerId: true, status: true },
    })
    if (!current) {
      throw new CampaignDomainError(
        'CAMPAIGN_NOT_FOUND',
        `Campaign ${ADMIN_CAMPAIGN_ID} was not found.`,
      )
    }
    const actorId =
      request.actor === 'CURRENT_CAMPAIGN_OWNER'
        ? current.ownerId
        : WORLD_OWNER_ID
    const actorName =
      request.actor === 'CURRENT_CAMPAIGN_OWNER'
        ? 'Current Campaign owner'
        : 'Wren (World owner, not Campaign owner)'
    let actual: string
    let expected: string

    if (request.action === 'transfer-admin-campaign') {
      const targetUserId =
        current.ownerId === WORLD_MEMBER_ID ? WORLD_ADMIN_ID : WORLD_MEMBER_ID
      const campaign = await campaignService.transferOwnership({
        campaignId: ADMIN_CAMPAIGN_ID,
        worldId: WORLD_ID,
        actorUserId: actorId,
        targetUserId,
      })
      actual = `owner ${campaign.ownerId}`
      expected = `owner ${targetUserId}`
    } else if (request.action === 'end-admin-campaign') {
      const campaign = await campaignService.endCampaign({
        campaignId: ADMIN_CAMPAIGN_ID,
        worldId: WORLD_ID,
        actorUserId: actorId,
      })
      actual = campaign.status
      expected = 'ENDED'
    } else if (request.action === 'archive-admin-campaign') {
      const campaign = await campaignService.archiveCampaign({
        campaignId: ADMIN_CAMPAIGN_ID,
        worldId: WORLD_ID,
        actorUserId: actorId,
      })
      actual = campaign.status
      expected = 'ARCHIVED'
    } else {
      await campaignService.deleteCampaign({
        campaignId: ADMIN_CAMPAIGN_ID,
        worldId: WORLD_ID,
        actorUserId: actorId,
      })
      actual = 'deleted'
      expected = 'deleted'
    }

    return {
      ok: true,
      message: `${actorName} completed ${request.action} through the production service.`,
      activity: {
        action: request.action,
        actor: actorName,
        target: ADMIN_CAMPAIGN_NAME,
        expected,
        actual,
        status:
          actual === expected || actual.includes(expected)
            ? 'passed'
            : 'failed',
      },
    }
  },
  mapError(error, action) {
    const request =
      action && typeof action === 'object'
        ? (action as Record<string, unknown>)
        : null

    if (error instanceof CampaignDomainError) {
      const expectedRejection =
        request?.actor === 'WORLD_OWNER' &&
        ((request.action === 'update-admin-campaign' &&
          error.code === 'CAMPAIGN_UPDATE_FORBIDDEN') ||
          error.code === 'CAMPAIGN_OWNERSHIP_TRANSFER_FORBIDDEN' ||
          error.code === 'CAMPAIGN_LIFECYCLE_FORBIDDEN' ||
          error.code === 'CAMPAIGN_DELETE_FORBIDDEN')
      const status =
        error.code === 'CAMPAIGN_NOT_FOUND'
          ? 404
          : error.code === 'CAMPAIGN_INVALID_STATUS_TRANSITION' ||
              error.code === 'CAMPAIGN_ARCHIVED_READ_ONLY'
            ? 409
            : 403
      return {
        code: error.code,
        message: error.message,
        status,
        activity: {
          action:
            typeof request?.action === 'string'
              ? request.action
              : 'campaign-lifecycle',
          actor:
            request?.actor === 'WORLD_OWNER'
              ? 'Wren (World owner, not Campaign owner)'
              : 'Current Campaign owner',
          target: ADMIN_CAMPAIGN_NAME,
          expected: expectedRejection
            ? error.code
            : 'Valid lifecycle transition',
          actual: error.code,
          domainErrorCode: error.code,
          status: expectedRejection ? 'passed' : 'failed',
        },
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
