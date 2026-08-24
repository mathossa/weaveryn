import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import {
  capture,
  expectInsideViewport,
  expectNoHorizontalOverflow,
  registerAndSignIn,
  registerThroughApi,
  signInThroughApi,
  requestJson,
  signIn,
  signOut,
} from './support/browser'
import {
  cleanupE2EFixture,
  countCampaignCharacter,
  createE2EPrismaClient,
  loadBackboneEvidence,
  type BackboneIds,
  type CleanupReport,
} from './support/database'
import {
  assertE2EEnvironment,
  createE2EFixture,
  type E2EUserFixture,
} from './support/environment'
import { E2EProductionServer } from './support/server'

test.describe.configure({ mode: 'serial' })

const environment = assertE2EEnvironment()
const fixture = createE2EFixture(environment)
const prisma = createE2EPrismaClient(environment)
const server = new E2EProductionServer()
const ids: Partial<BackboneIds> = {}
let cleanupReport: CleanupReport | undefined

interface ErrorBody {
  error: { code: string; message: string }
}

interface CampaignBody {
  campaign: {
    id: string
    ownerId: string
    worldId: string | null
    timelineId: string | null
    status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
  }
}

interface InvitationBody {
  invitation: { id: string }
  invitePath: string
}

function pathId(url: string, pattern: RegExp, label: string) {
  const match = new URL(url).pathname.match(pattern)
  if (!match?.[1]) throw new Error(`Could not read ${label} from ${url}.`)
  return match[1]
}

function completeIds(): BackboneIds {
  const keys: Array<keyof BackboneIds> = [
    'ownerUserId',
    'primaryWorldId',
    'secondaryWorldId',
    'primaryCampaignId',
    'memberCampaignId',
    'secondaryCampaignId',
    'archivedCampaignId',
    'characterId',
    'primaryWorldCharacterId',
    'secondaryWorldCharacterId',
    'primaryCampaignCharacterId',
    'secondaryCampaignCharacterId',
    'locationEntityId',
    'organizationEntityId',
    'relationshipId',
    'worldEventId',
  ]
  for (const key of keys) {
    if (!ids[key]) throw new Error(`Backbone identifier ${key} was not set.`)
  }
  return ids as BackboneIds
}

async function closeContexts(...contexts: Array<BrowserContext | undefined>) {
  await Promise.allSettled(
    contexts
      .filter((context): context is BrowserContext => Boolean(context))
      .map((context) => context.close()),
  )
}

async function assertError(
  context: BrowserContext,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  status: number,
  code: string,
  data?: unknown,
) {
  const result = await requestJson<ErrorBody>(
    context.request,
    method,
    path,
    status,
    data,
  )
  expect(result.body.error.code).toBe(code)
  return result.body
}

async function createCampaign(
  context: BrowserContext,
  worldId: string,
  campaign: { name: string; description: string },
  position: string,
  dateLabel: string,
) {
  const result = await requestJson<CampaignBody>(
    context.request,
    'POST',
    `/api/v1/worlds/${worldId}/campaigns`,
    201,
    {
      ...campaign,
      currentWorldPosition: position,
      currentWorldDateLabel: dateLabel,
    },
  )
  return result.body.campaign
}

async function assertUnavailableRoutes(
  page: Page,
  worldId: string,
  campaignId: string,
  characterId: string,
  entityId: string,
) {
  await page.goto(`/world/${worldId}`)
  await expect(
    page.getByRole('heading', { name: 'World unavailable' }),
  ).toBeVisible()
  await page.goto(`/world/${worldId}/campaign/${campaignId}`)
  await expect(
    page.getByRole('heading', { name: 'Campaign unavailable' }),
  ).toBeVisible()
  await page.goto(`/character/portable/${characterId}`)
  await expect(
    page.getByRole('heading', { name: 'Character unavailable' }),
  ).toBeVisible()
  await page.goto(`/world/${worldId}/entities/${entityId}`)
  await expect(
    page.getByRole('heading', { name: 'World entity not found' }),
  ).toBeVisible()
}

test.beforeAll(async () => {
  const stale = await cleanupE2EFixture(prisma, fixture)
  if (
    Object.values(stale).some((value) => typeof value === 'number' && value > 0)
  ) {
    console.log('Removed a stale, ownership-validated E2E namespace.', stale)
  }
  await server.start()
})

test.afterAll(async ({}, testInfo) => {
  await server.stop()
  const logPath = await server.writeLog(testInfo.outputPath('server'))
  await testInfo.attach('application-server-log', {
    path: logPath,
    contentType: 'text/plain',
  })
  try {
    cleanupReport = await cleanupE2EFixture(prisma, fixture)
    console.log('E2E cleanup report:', cleanupReport)
    expect(cleanupReport.retained).toEqual([])
  } finally {
    await prisma.$disconnect()
  }
})

test('persists and protects the complete MVP backbone', async ({
  browser,
}, testInfo) => {
  let ownerContext: BrowserContext | undefined
  let memberContext: BrowserContext | undefined
  let assistantContext: BrowserContext | undefined
  let freshContext: BrowserContext | undefined
  let restartedContext: BrowserContext | undefined

  try {
    const invalidContext = await browser.newContext({
      baseURL: server.baseURL,
      reducedMotion: 'reduce',
    })
    const invalidPage = await invalidContext.newPage()
    await invalidPage.goto('/login')
    await invalidPage.getByLabel('Email').fill(fixture.users.owner.email)
    await invalidPage
      .getByLabel('Password', { exact: true })
      .fill('deliberately-wrong-password')
    await invalidPage.getByRole('button', { name: 'Enter Weaveryn' }).click()
    await expect(
      invalidPage.getByText('Email or password is incorrect.'),
    ).toBeVisible()
    await capture(invalidPage, testInfo, 'invalid-login')
    await invalidContext.close()

    const owner = await registerAndSignIn(
      browser,
      server.baseURL,
      fixture.users.owner,
    )
    ownerContext = owner.context
    await owner.page.close()
    memberContext = await registerThroughApi(
      browser,
      server.baseURL,
      fixture.users.worldMember,
    )
    assistantContext = await registerThroughApi(
      browser,
      server.baseURL,
      fixture.users.assistant,
    )
    let ownerPage = await ownerContext.newPage()
    const memberPage = await memberContext.newPage()
    const assistantPage = await assistantContext.newPage()

    const registeredUsers = [
      fixture.users.owner,
      fixture.users.worldMember,
      fixture.users.assistant,
    ]
    const users = await prisma.user.findMany({
      where: { email: { in: registeredUsers.map((user) => user.email) } },
      select: { id: true, email: true },
    })
    expect(users).toHaveLength(3)
    const userId = (user: E2EUserFixture) => {
      const record = users.find((candidate) => candidate.email === user.email)
      if (!record) throw new Error(`Missing registered User ${user.email}.`)
      return record.id
    }
    ids.ownerUserId = userId(fixture.users.owner)
    const memberUserId = userId(fixture.users.worldMember)
    const assistantUserId = userId(fixture.users.assistant)

    await ownerPage.goto('/world/create')
    await ownerPage.getByLabel('World name').fill(fixture.primaryWorld.name)
    await ownerPage
      .getByLabel('Description')
      .fill(fixture.primaryWorld.description)
    await ownerPage.getByRole('button', { name: 'Create World' }).click()
    await ownerPage.waitForURL(/\/world\/[0-9a-f-]+$/)
    ids.primaryWorldId = pathId(
      ownerPage.url(),
      /^\/world\/([^/]+)$/,
      'primary World ID',
    )
    await expect(
      ownerPage.getByRole('heading', { name: fixture.primaryWorld.name }),
    ).toBeVisible()
    const primaryWorld = await prisma.world.findUniqueOrThrow({
      where: { id: ids.primaryWorldId },
      select: { ownerId: true, timelines: { select: { id: true } } },
    })
    expect(primaryWorld.ownerId).toBe(ids.ownerUserId)
    expect(primaryWorld.timelines).toHaveLength(1)
    await capture(ownerPage, testInfo, 'world-overview')

    await ownerPage.goto(`/world/${ids.primaryWorldId}/campaign/create`)
    await ownerPage
      .getByLabel('Campaign name')
      .fill(fixture.primaryCampaign.name)
    await ownerPage
      .getByLabel('Description')
      .fill(fixture.primaryCampaign.description)
    await ownerPage.getByLabel('World date label').fill('12 Emberwane')
    await ownerPage.getByLabel('Timeline position').fill('142.5')
    await ownerPage.getByRole('button', { name: 'Create Campaign' }).click()
    await ownerPage.waitForURL(/\/world\/[0-9a-f-]+\/campaign\/[0-9a-f-]+$/)
    ids.primaryCampaignId = pathId(
      ownerPage.url(),
      /^\/world\/[^/]+\/campaign\/([^/]+)$/,
      'primary Campaign ID',
    )
    const primaryCampaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: ids.primaryCampaignId },
      select: { ownerId: true, worldId: true, timelineId: true },
    })
    expect(primaryCampaign).toMatchObject({
      ownerId: ids.ownerUserId,
      worldId: ids.primaryWorldId,
    })
    expect(primaryCampaign.timelineId).toBe(primaryWorld.timelines[0]?.id)
    await capture(ownerPage, testInfo, 'campaign-dashboard')

    await ownerPage.goto(
      `/character/create?world=${ids.primaryWorldId}&campaign=${ids.primaryCampaignId}`,
    )
    await ownerPage.getByLabel('Character name').fill(fixture.character.name)
    await ownerPage.getByRole('button', { name: 'Create Character' }).click()
    await ownerPage.waitForURL(/\/character\/portable\/[0-9a-f-]+/)
    ids.characterId = pathId(
      ownerPage.url(),
      /^\/character\/portable\/([^/]+)$/,
      'portable Character ID',
    )
    await ownerPage
      .getByRole('button', { name: `Add to ${fixture.primaryWorld.name}` })
      .first()
      .click()
    await ownerPage.waitForURL(/\/character\/[0-9a-f-]+/)
    ids.primaryWorldCharacterId = pathId(
      ownerPage.url(),
      /^\/character\/([^/]+)$/,
      'primary WorldCharacter ID',
    )
    const participation = await requestJson<{
      campaignCharacter: { id: string }
    }>(
      ownerContext.request,
      'POST',
      `/api/v1/world-characters/${ids.primaryWorldCharacterId}/campaign-characters`,
      201,
      { campaignId: ids.primaryCampaignId },
    )
    ids.primaryCampaignCharacterId = participation.body.campaignCharacter.id
    await ownerPage.goto(
      `/character/${ids.primaryWorldCharacterId}?campaign=${ids.primaryCampaignId}`,
    )
    await expect(
      ownerPage.getByRole('heading', {
        name: fixture.character.name,
        level: 1,
      }),
    ).toBeVisible()
    await expect(
      ownerPage.getByText(fixture.primaryCampaign.name).first(),
    ).toBeVisible()
    await capture(ownerPage, testInfo, 'character-overview')

    await ownerPage.goto(`/world/${ids.primaryWorldId}/entities/create`)
    await ownerPage.getByLabel('Type').selectOption('location')
    const entityArtworkChoices = ownerPage.getByRole('button', {
      name: /^(Default artwork|Artwork option [2-6]):/,
    })
    await expect(entityArtworkChoices).toHaveCount(6)
    await expect(
      ownerPage.getByRole('button', { name: /^Default artwork:/ }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expectNoHorizontalOverflow(ownerPage)
    await capture(ownerPage, testInfo, 'entity-artwork-picker')
    await ownerPage.getByLabel('Name').fill(fixture.location.name)
    await ownerPage.getByLabel('Description').fill(fixture.location.description)
    await ownerPage.getByRole('button', { name: 'Create entity' }).click()
    await ownerPage.waitForURL(/\/entities\/[0-9a-f-]+$/)
    ids.locationEntityId = pathId(
      ownerPage.url(),
      /^\/world\/[^/]+\/entities\/([^/]+)$/,
      'Location entity ID',
    )

    await ownerPage.goto(`/world/${ids.primaryWorldId}/entities/create`)
    await ownerPage.getByLabel('Type').selectOption('organization')
    const fourthArtwork = ownerPage.getByRole('button', {
      name: /^Artwork option 4:/,
    })
    await fourthArtwork.click()
    await expect(fourthArtwork).toHaveAttribute('aria-pressed', 'true')
    await ownerPage.getByLabel('Name').fill(fixture.organization.name)
    await ownerPage
      .getByLabel('Description')
      .fill(fixture.organization.description)
    await ownerPage.getByRole('button', { name: 'Add connection' }).click()
    await ownerPage
      .getByLabel('How are they connected?')
      .fill(fixture.relationship.type)
    await ownerPage.getByLabel('Connect to').selectOption(ids.locationEntityId)
    await ownerPage.getByText('More options').click()
    await ownerPage
      .getByLabel('Note (optional)')
      .fill(fixture.relationship.label)
    await ownerPage.getByRole('button', { name: 'Create entity' }).click()
    await ownerPage.waitForURL(/\/entities\/[0-9a-f-]+$/)
    ids.organizationEntityId = pathId(
      ownerPage.url(),
      /^\/world\/[^/]+\/entities\/([^/]+)$/,
      'Organization entity ID',
    )
    const selectedArtwork = await prisma.worldEntity.findUnique({
      where: { id: ids.organizationEntityId },
      select: { image: true },
    })
    expect(selectedArtwork?.image).toBe('/images/entities/organization-04.webp')
    const relationships = await requestJson<{
      relationships: Array<{ id: string; label: string | null }>
    }>(
      ownerContext.request,
      'GET',
      `/api/v1/worlds/${ids.primaryWorldId}/relationships`,
      200,
    )
    const relationship = relationships.body.relationships.find(
      (candidate) => candidate.label === fixture.relationship.label,
    )
    if (!relationship)
      throw new Error('Initial entity relationship was not persisted.')
    ids.relationshipId = relationship.id

    const worldEvent = await requestJson<{ event: { id: string } }>(
      ownerContext.request,
      'POST',
      `/api/v1/worlds/${ids.primaryWorldId}/events`,
      201,
      {
        ...fixture.worldEvent,
        startDate: { year: '812' },
        entityIds: [ids.locationEntityId, ids.organizationEntityId],
      },
    )
    ids.worldEventId = worldEvent.body.event.id
    await requestJson(
      ownerContext.request,
      'PATCH',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.primaryCampaignId}/context`,
      200,
      {
        currentLocationId: ids.locationEntityId,
        currentFocus: `${fixture.marker} follow the lantern accord`,
      },
    )
    await requestJson(
      ownerContext.request,
      'POST',
      '/api/v1/selection/use',
      200,
      {
        kind: 'WEAVER',
        worldId: ids.primaryWorldId,
        campaignId: ids.primaryCampaignId,
      },
    )
    await requestJson(
      ownerContext.request,
      'PATCH',
      '/api/v1/selection/weaver-preferences',
      200,
      {
        worldId: ids.primaryWorldId,
        campaignId: ids.primaryCampaignId,
        pinned: true,
      },
    )
    await requestJson(
      ownerContext.request,
      'POST',
      '/api/v1/selection/use',
      200,
      {
        kind: 'CHARACTER',
        worldCharacterId: ids.primaryWorldCharacterId,
        campaignId: ids.primaryCampaignId,
      },
    )
    await requestJson(
      ownerContext.request,
      'PATCH',
      '/api/v1/selection/preferences',
      200,
      {
        worldCharacterId: ids.primaryWorldCharacterId,
        campaignId: ids.primaryCampaignId,
        pinned: true,
      },
    )

    await ownerPage.goto('/select')
    await expect(
      ownerPage.getByText(fixture.primaryWorld.name).first(),
    ).toBeVisible()
    await expect(
      ownerPage.getByText(fixture.primaryCampaign.name).first(),
    ).toBeVisible()
    await expect(
      ownerPage.getByText(fixture.character.name).first(),
    ).toBeVisible()
    await capture(ownerPage, testInfo, 'selection-screen')
    await ownerPage.goto(`/world/${ids.primaryWorldId}`)
    await expect(
      ownerPage.getByRole('heading', { name: fixture.primaryWorld.name }),
    ).toBeVisible()
    await ownerPage.reload()
    await expect(
      ownerPage.getByRole('heading', { name: fixture.primaryWorld.name }),
    ).toBeVisible()
    await ownerPage.goto(
      `/world/${ids.primaryWorldId}/campaign/${ids.primaryCampaignId}?mode=weaver`,
    )
    await expect(
      ownerPage.getByText(fixture.location.name).first(),
    ).toBeVisible()
    await expect(
      ownerPage
        .getByText(`${fixture.marker} follow the lantern accord`)
        .first(),
    ).toBeVisible()
    await ownerPage.reload()
    await expect(
      ownerPage.getByRole('heading', { name: fixture.primaryCampaign.name }),
    ).toBeVisible()
    await ownerPage.goto(
      `/world/${ids.primaryWorldId}/campaign/${ids.primaryCampaignId}/manage?mode=weaver`,
    )
    await expect(
      ownerPage.getByRole('heading', { name: fixture.primaryCampaign.name }),
    ).toBeVisible()
    await expect(
      ownerPage.getByRole('heading', { name: 'Campaign details' }),
    ).toBeVisible()
    await expect(
      ownerPage.getByRole('heading', { name: 'Delete Campaign' }),
    ).toHaveCount(0)
    await capture(ownerPage, testInfo, 'campaign-management-hub')
    await ownerPage.goto(`/world/${ids.primaryWorldId}/entities`)
    await expect(
      ownerPage.getByRole('heading', { name: 'World entities' }),
    ).toBeVisible()
    await expect(
      ownerPage.getByText(fixture.location.name).first(),
    ).toBeVisible()
    await capture(ownerPage, testInfo, 'entity-browser')
    await ownerPage.goto(
      `/world/${ids.primaryWorldId}/entities/${ids.organizationEntityId}`,
    )
    await expect(ownerPage.getByText(fixture.relationship.label)).toBeVisible()
    await capture(ownerPage, testInfo, 'entity-detail')
    await ownerPage
      .getByRole('link')
      .filter({ hasText: fixture.location.name })
      .click()
    await ownerPage.waitForURL(`**/entities/${ids.locationEntityId}`)
    await expect(
      ownerPage.getByRole('heading', { name: fixture.location.name }),
    ).toBeVisible()
    await ownerPage.reload()
    await expect(ownerPage.getByText(fixture.relationship.label)).toBeVisible()

    await signInThroughApi(memberContext, fixture.users.worldMember)
    await signInThroughApi(assistantContext, fixture.users.assistant)

    for (const [path, status, code] of [
      [`/api/v1/worlds/${ids.primaryWorldId}`, 404, 'WORLD_NOT_FOUND'],
      [
        `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.primaryCampaignId}`,
        404,
        'CAMPAIGN_NOT_FOUND',
      ],
      [`/api/v1/characters/${ids.characterId}`, 404, 'CHARACTER_NOT_FOUND'],
      [
        `/api/v1/world-characters/${ids.primaryWorldCharacterId}`,
        404,
        'WORLD_CHARACTER_NOT_FOUND',
      ],
      [
        `/api/v1/worlds/${ids.primaryWorldId}/entities/${ids.locationEntityId}`,
        403,
        'WORLD_PERMISSION_DENIED',
      ],
    ] as const) {
      await assertError(assistantContext, 'GET', path, status, code)
    }
    await assertUnavailableRoutes(
      assistantPage,
      ids.primaryWorldId,
      ids.primaryCampaignId,
      ids.characterId,
      ids.locationEntityId,
    )
    await capture(assistantPage, testInfo, 'authorization-failure')

    const worldInvitation = await requestJson<InvitationBody>(
      ownerContext.request,
      'POST',
      `/api/v1/worlds/${ids.primaryWorldId}/invitations`,
      201,
      { role: 'MEMBER' },
    )
    const worldToken = worldInvitation.body.invitePath.split('/').at(-1)
    if (!worldToken) throw new Error('World invitation token was not returned.')
    await memberPage.goto(worldInvitation.body.invitePath)
    await expect(
      memberPage.getByRole('heading', { name: fixture.primaryWorld.name }),
    ).toBeVisible()
    await memberPage.getByRole('button', { name: 'Accept invitation' }).click()
    await memberPage.waitForURL(`**/world/${ids.primaryWorldId}`)
    await expect(memberPage.getByText('Threadwalker · World')).toBeVisible()
    await assertError(
      memberContext,
      'POST',
      `/api/v1/invitations/${worldToken}`,
      409,
      'INVITATION_ALREADY_USED',
    )
    await assertError(
      memberContext,
      'GET',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.primaryCampaignId}`,
      404,
      'CAMPAIGN_NOT_FOUND',
    )
    await memberPage.goto(
      `/world/${ids.primaryWorldId}/campaign/${ids.primaryCampaignId}`,
    )
    await expect(
      memberPage.getByRole('heading', { name: 'Campaign unavailable' }),
    ).toBeVisible()
    await memberPage.goto(`/world/${ids.primaryWorldId}/campaign/create`)
    await memberPage
      .getByLabel('Campaign name')
      .fill(fixture.memberCampaign.name)
    await memberPage
      .getByLabel('Description')
      .fill(fixture.memberCampaign.description)
    await memberPage.getByLabel('World date label').fill('1 Hearthlight')
    await memberPage.getByLabel('Timeline position').fill('150')
    await memberPage.getByRole('button', { name: 'Create Campaign' }).click()
    await memberPage.waitForURL(/\/campaign\/[0-9a-f-]+$/)
    ids.memberCampaignId = pathId(
      memberPage.url(),
      /^\/world\/[^/]+\/campaign\/([^/]+)$/,
      'member-owned Campaign ID',
    )
    const memberCampaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: ids.memberCampaignId },
      select: { ownerId: true, world: { select: { ownerId: true } } },
    })
    expect(memberCampaign.ownerId).toBe(memberUserId)
    expect(memberCampaign.world?.ownerId).toBe(ids.ownerUserId)
    await assertError(
      memberContext,
      'PATCH',
      `/api/v1/worlds/${ids.primaryWorldId}`,
      403,
      'WORLD_UPDATE_FORBIDDEN',
      {
        name: fixture.primaryWorld.name,
        description: `${fixture.marker} unauthorized update`,
      },
    )
    await memberPage.goto(`/world/${ids.primaryWorldId}/settings`)
    await expect(
      memberPage.getByText('World settings unavailable'),
    ).toBeVisible()
    await memberPage.goto(`/world/${ids.primaryWorldId}/members`)
    await expect(
      memberPage.getByText('World management unavailable'),
    ).toBeVisible()

    const campaignInvitation = await requestJson<InvitationBody>(
      ownerContext.request,
      'POST',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.primaryCampaignId}/invitations`,
      201,
      { role: 'ASSISTANT_GM' },
    )
    await assistantPage.goto(campaignInvitation.body.invitePath)
    await expect(
      assistantPage.getByRole('heading', {
        name: fixture.primaryCampaign.name,
      }),
    ).toBeVisible()
    await assistantPage
      .getByRole('button', { name: 'Accept invitation' })
      .click()
    await assistantPage.waitForURL(
      `**/campaign/${ids.primaryCampaignId}?mode=weaver`,
    )
    const assistantState = await prisma.user.findUniqueOrThrow({
      where: { id: assistantUserId },
      select: {
        worldMemberships: { where: { worldId: ids.primaryWorldId } },
        campaignMemberships: { where: { campaignId: ids.primaryCampaignId } },
        ownedCharacters: true,
      },
    })
    expect(assistantState.worldMemberships).toHaveLength(0)
    expect(assistantState.campaignMemberships).toMatchObject([
      { role: 'ASSISTANT_GM' },
    ])
    expect(assistantState.ownedCharacters).toHaveLength(0)
    await requestJson(
      assistantContext.request,
      'GET',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.primaryCampaignId}`,
      200,
    )
    await requestJson(
      assistantContext.request,
      'GET',
      `/api/v1/worlds/${ids.primaryWorldId}`,
      200,
    )
    await assertError(
      assistantContext,
      'GET',
      `/api/v1/worlds/${ids.primaryWorldId}/entities/${ids.locationEntityId}`,
      404,
      'WORLD_ENTITY_NOT_FOUND',
    )
    await requestJson(
      assistantContext.request,
      'PATCH',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.primaryCampaignId}`,
      200,
      { description: `${fixture.marker} updated by Assistant GM` },
    )
    await assertError(
      assistantContext,
      'PATCH',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.primaryCampaignId}`,
      403,
      'CAMPAIGN_UPDATE_FORBIDDEN',
      { name: `${fixture.marker} forbidden rename` },
    )
    await assertError(
      assistantContext,
      'POST',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.primaryCampaignId}/end`,
      403,
      'CAMPAIGN_LIFECYCLE_FORBIDDEN',
    )
    await assertError(
      assistantContext,
      'POST',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.primaryCampaignId}/transfer`,
      403,
      'CAMPAIGN_OWNERSHIP_TRANSFER_FORBIDDEN',
      { targetUserId: assistantUserId },
    )
    await assertError(
      assistantContext,
      'POST',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.primaryCampaignId}/invitations`,
      403,
      'CAMPAIGN_MEMBERSHIP_FORBIDDEN',
      { role: 'PLAYER' },
    )
    await assistantPage.goto(
      `/world/${ids.primaryWorldId}/campaign/${ids.primaryCampaignId}/manage?mode=weaver`,
    )
    await expect(
      assistantPage.getByRole('heading', { name: 'Campaign details' }),
    ).toBeVisible()
    await expect(
      assistantPage.getByRole('heading', { name: 'Members & roles' }),
    ).toHaveCount(0)
    await expect(
      assistantPage.getByRole('heading', { name: 'Advanced' }),
    ).toHaveCount(0)

    const missingId = '00000000-0000-4000-8000-000000000022'
    await assertError(
      ownerContext,
      'GET',
      `/api/v1/worlds/${missingId}`,
      404,
      'WORLD_NOT_FOUND',
    )
    await assertError(
      ownerContext,
      'GET',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${missingId}`,
      404,
      'CAMPAIGN_NOT_FOUND',
    )
    await assertError(
      ownerContext,
      'GET',
      `/api/v1/characters/${missingId}`,
      404,
      'CHARACTER_NOT_FOUND',
    )
    await assertError(
      ownerContext,
      'GET',
      `/api/v1/worlds/${ids.primaryWorldId}/entities/${missingId}`,
      404,
      'WORLD_ENTITY_NOT_FOUND',
    )
    await assertUnavailableRoutes(
      ownerPage,
      missingId,
      missingId,
      missingId,
      missingId,
    )

    const secondaryWorld = await requestJson<{ world: { id: string } }>(
      ownerContext.request,
      'POST',
      '/api/v1/worlds',
      201,
      fixture.secondaryWorld,
    )
    ids.secondaryWorldId = secondaryWorld.body.world.id
    const secondaryCampaign = await createCampaign(
      ownerContext,
      ids.secondaryWorldId,
      fixture.secondaryCampaign,
      '8',
      '8 Farwake',
    )
    ids.secondaryCampaignId = secondaryCampaign.id
    const secondaryWorldCharacter = await requestJson<{
      worldCharacter: { id: string; worldId: string }
    }>(
      ownerContext.request,
      'POST',
      `/api/v1/characters/${ids.characterId}/world-characters`,
      201,
      { worldId: ids.secondaryWorldId },
    )
    ids.secondaryWorldCharacterId =
      secondaryWorldCharacter.body.worldCharacter.id
    expect(secondaryWorldCharacter.body.worldCharacter.worldId).toBe(
      ids.secondaryWorldId,
    )
    await assertError(
      ownerContext,
      'POST',
      `/api/v1/world-characters/${ids.secondaryWorldCharacterId}/campaign-characters`,
      400,
      'CAMPAIGN_CHARACTER_CROSS_WORLD',
      { campaignId: ids.primaryCampaignId },
    )
    expect(
      await countCampaignCharacter(
        prisma,
        ids.primaryCampaignId,
        ids.secondaryWorldCharacterId,
      ),
    ).toBe(0)
    const secondaryParticipation = await requestJson<{
      campaignCharacter: { id: string }
    }>(
      ownerContext.request,
      'POST',
      `/api/v1/world-characters/${ids.secondaryWorldCharacterId}/campaign-characters`,
      201,
      { campaignId: ids.secondaryCampaignId },
    )
    ids.secondaryCampaignCharacterId =
      secondaryParticipation.body.campaignCharacter.id
    expect(
      await countCampaignCharacter(
        prisma,
        ids.secondaryCampaignId,
        ids.secondaryWorldCharacterId,
      ),
    ).toBe(1)
    expect(
      await countCampaignCharacter(
        prisma,
        ids.primaryCampaignId,
        ids.primaryWorldCharacterId,
      ),
    ).toBe(1)

    const archivedCampaign = await createCampaign(
      ownerContext,
      ids.primaryWorldId,
      fixture.archivedCampaign,
      '99',
      '99 Afterglow',
    )
    ids.archivedCampaignId = archivedCampaign.id
    await requestJson(
      ownerContext.request,
      'POST',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.archivedCampaignId}/end`,
      200,
    )
    await requestJson(
      ownerContext.request,
      'POST',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.archivedCampaignId}/archive`,
      200,
    )
    await assertError(
      ownerContext,
      'PATCH',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.archivedCampaignId}`,
      403,
      'CAMPAIGN_UPDATE_FORBIDDEN',
      { description: `${fixture.marker} archived mutation` },
    )
    const archivedRead = await requestJson<CampaignBody>(
      ownerContext.request,
      'GET',
      `/api/v1/worlds/${ids.primaryWorldId}/campaigns/${ids.archivedCampaignId}`,
      200,
    )
    expect(archivedRead.body.campaign.status).toBe('ARCHIVED')
    await ownerPage.goto(
      `/world/${ids.primaryWorldId}/campaign/${ids.archivedCampaignId}/manage?mode=weaver`,
    )
    await expect(ownerPage.getByText('Archived').first()).toBeVisible()
    await expect(
      ownerPage.getByRole('heading', { name: 'Advanced' }),
    ).toBeVisible()
    await expect(
      ownerPage.getByRole('heading', { name: 'Campaign details' }),
    ).toHaveCount(0)

    await ownerPage.goto(
      `/world/${ids.primaryWorldId}/campaign/${ids.primaryCampaignId}?mode=weaver`,
    )
    await ownerPage
      .getByRole('button', {
        name: `Switch World from ${fixture.primaryWorld.name}`,
      })
      .click()
    await ownerPage
      .getByRole('menuitem')
      .filter({ hasText: fixture.secondaryWorld.name })
      .click()
    await expect(
      ownerPage.getByRole('heading', { name: fixture.secondaryWorld.name }),
    ).toBeVisible()
    await ownerPage
      .getByRole('button', {
        name: `Switch World from ${fixture.secondaryWorld.name}`,
      })
      .click()
    await ownerPage
      .getByRole('menuitem')
      .filter({ hasText: fixture.primaryWorld.name })
      .click()
    await expect(
      ownerPage.getByRole('heading', { name: fixture.primaryWorld.name }),
    ).toBeVisible()

    const evidenceBeforeReturn = await loadBackboneEvidence(
      prisma,
      completeIds(),
    )
    expect(evidenceBeforeReturn.owner?.email).toBe(fixture.users.owner.email)
    expect(evidenceBeforeReturn.primaryWorld).toMatchObject({
      ownerId: ids.ownerUserId,
      name: fixture.primaryWorld.name,
    })
    expect(evidenceBeforeReturn.primaryWorld?.timelines).toHaveLength(1)
    expect(evidenceBeforeReturn.primaryCampaign).toMatchObject({
      ownerId: ids.ownerUserId,
      worldId: ids.primaryWorldId,
      currentLocationId: ids.locationEntityId,
      currentFocus: `${fixture.marker} follow the lantern accord`,
      campaignCharacters: [
        {
          id: ids.primaryCampaignCharacterId,
          worldCharacterId: ids.primaryWorldCharacterId,
        },
      ],
    })
    expect(evidenceBeforeReturn.character?.worldCharacters).toHaveLength(2)
    expect(evidenceBeforeReturn.relationship).toMatchObject({
      sourceEntityId: ids.organizationEntityId,
      targetEntityId: ids.locationEntityId,
      relationshipType: fixture.relationship.type,
      label: fixture.relationship.label,
    })
    expect(
      evidenceBeforeReturn.worldEvent?.entities
        .map((entry) => entry.worldEntityId)
        .sort(),
    ).toEqual([ids.locationEntityId, ids.organizationEntityId].sort())
    expect(evidenceBeforeReturn.preferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          worldId: ids.primaryWorldId,
          campaignId: ids.primaryCampaignId,
          pinned: true,
        }),
        expect.objectContaining({
          worldCharacterId: ids.primaryWorldCharacterId,
          campaignId: ids.primaryCampaignId,
          pinned: true,
        }),
      ]),
    )

    await ownerPage.goto(`/world/${ids.primaryWorldId}`)
    await signOut(ownerPage)
    await ownerContext.close()
    ownerContext = undefined

    const fresh = await signIn(browser, server.baseURL, fixture.users.owner)
    freshContext = fresh.context
    const freshPage = fresh.page
    await freshPage.goto(
      `/world/${ids.primaryWorldId}/campaign/${ids.primaryCampaignId}?mode=weaver`,
    )
    await expect(
      freshPage.getByRole('heading', { name: fixture.primaryCampaign.name }),
    ).toBeVisible()
    await freshPage.reload()
    await expect(
      freshPage.getByText(fixture.location.name).first(),
    ).toBeVisible()

    await freshContext.close()
    freshContext = undefined
    await server.restart()
    const restarted = await signIn(browser, server.baseURL, fixture.users.owner)
    restartedContext = restarted.context
    ownerPage = restarted.page
    await ownerPage.goto('/select')
    await expect(
      ownerPage.getByText(fixture.primaryCampaign.name).first(),
    ).toBeVisible()
    await expect(
      ownerPage.getByText(fixture.character.name).first(),
    ).toBeVisible()
    await capture(ownerPage, testInfo, 'restored-after-server-restart')
    const evidenceAfterRestart = await loadBackboneEvidence(
      prisma,
      completeIds(),
    )
    const { preferences: preferencesBeforeReturn, ...backboneBeforeReturn } =
      evidenceBeforeReturn
    const { preferences: preferencesAfterRestart, ...backboneAfterRestart } =
      evidenceAfterRestart
    expect(backboneAfterRestart).toEqual(backboneBeforeReturn)

    const stablePinnedPreferences = (
      preferences: typeof preferencesBeforeReturn,
    ) =>
      preferences
        .filter((preference) => preference.pinned)
        .map((preference) => ({
          kind: preference.kind,
          entryKey: preference.entryKey,
          worldId: preference.worldId,
          campaignId: preference.campaignId,
          worldCharacterId: preference.worldCharacterId,
          pinned: preference.pinned,
        }))
    expect(stablePinnedPreferences(preferencesAfterRestart)).toEqual(
      stablePinnedPreferences(preferencesBeforeReturn),
    )
    expect(preferencesAfterRestart).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'WEAVER',
          entryKey: 'weaver',
          worldId: ids.primaryWorldId,
        }),
      ]),
    )

    await ownerPage.setViewportSize({ width: 390, height: 844 })
    await ownerPage.goto(
      `/world/${ids.primaryWorldId}/campaign/${ids.primaryCampaignId}?mode=weaver`,
    )
    await expect(
      ownerPage.getByRole('navigation', { name: 'Campaign companion' }),
    ).toBeVisible()
    await expectNoHorizontalOverflow(ownerPage)
    const mobileContextButton = ownerPage.getByRole('button', {
      name: fixture.primaryCampaign.name,
    })
    await mobileContextButton.focus()
    await ownerPage.keyboard.press('Enter')
    const mobileDialog = ownerPage.getByRole('dialog', {
      name: fixture.primaryCampaign.name,
    })
    await expect(mobileDialog).toBeVisible()
    await expectInsideViewport(ownerPage, '#mobile-context-panel')
    const mobileCloseButton = mobileDialog.getByRole('button', {
      name: 'Close context selector',
    })
    await mobileCloseButton.focus()
    await expect(mobileCloseButton).toBeFocused()
    await capture(ownerPage, testInfo, 'phone-navigation')
    await mobileCloseButton.click()

    await ownerPage.setViewportSize({ width: 820, height: 1180 })
    await ownerPage.goto(
      `/world/${ids.primaryWorldId}/entities/${ids.organizationEntityId}`,
    )
    await expectNoHorizontalOverflow(ownerPage)
    await ownerPage.getByRole('button', { name: 'Add connection' }).click()
    await expect(
      ownerPage.getByRole('heading', { name: 'Add connection' }),
    ).toBeVisible()
    await expectInsideViewport(ownerPage, 'dialog[open]')
    await ownerPage.keyboard.press('Tab')
    expect(
      await ownerPage
        .locator('dialog[open]')
        .evaluate((dialog) => dialog.contains(document.activeElement)),
    ).toBe(true)
    await ownerPage.getByRole('button', { name: 'Close' }).click()

    await ownerPage.setViewportSize({ width: 1920, height: 1080 })
    await ownerPage.goto(`/world/${ids.primaryWorldId}/entities`)
    await expectNoHorizontalOverflow(ownerPage)

    await ownerPage.setViewportSize({ width: 2560, height: 1440 })
    await ownerPage.goto(
      `/world/${ids.primaryWorldId}/campaign/${ids.primaryCampaignId}/manage?mode=weaver`,
      { waitUntil: 'domcontentloaded' },
    )
    await expectNoHorizontalOverflow(ownerPage)
    await expect(
      ownerPage.getByRole('heading', { name: 'Campaign details' }),
    ).toBeVisible()
    await expect(
      ownerPage.getByRole('heading', { name: 'Members & roles' }),
    ).toBeVisible()
    await expect(
      ownerPage.getByRole('heading', { name: 'Advanced' }),
    ).toBeVisible()
    await expect(
      ownerPage.getByRole('button', { name: 'End Campaign' }),
    ).toHaveCount(0)
    await expect(
      ownerPage.getByRole('button', { name: 'Delete Campaign' }),
    ).toHaveCount(0)
    await capture(ownerPage, testInfo, 'management-hub-2560')
    await ownerPage
      .getByRole('link', { name: /Manage advanced options/ })
      .click()
    await expect(
      ownerPage.getByRole('heading', { name: 'Advanced' }),
    ).toBeVisible()
    await expect(
      ownerPage.getByRole('button', { name: 'End Campaign' }),
    ).toBeVisible()
    await expect(
      ownerPage.getByRole('heading', { name: 'Delete Campaign' }),
    ).toBeVisible()
    await expectNoHorizontalOverflow(ownerPage)
  } finally {
    await closeContexts(
      ownerContext,
      memberContext,
      assistantContext,
      freshContext,
      restartedContext,
    )
  }
})
