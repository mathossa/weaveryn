import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
import {
  getWorldOverview,
  listWorldNavigationChoices,
} from './world-ui-service'

const ids: string[] = []
const emails: string[] = []

function id() {
  const value = randomUUID()
  ids.push(value)
  return value
}

async function createUser(label: string) {
  const email = `world-ui-${label}-${randomUUID()}@weaveryn.local`
  emails.push(email)
  return prisma.user.create({
    data: {
      id: id(),
      email,
      username: `world_ui_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      displayName: `World UI ${label}`,
    },
  })
}

describe('World UI projections', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await prisma.campaignMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaign.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldTimeline.deleteMany({ where: { id: { in: ids } } })
    await prisma.world.deleteMany({ where: { id: { in: ids } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    ids.length = 0
    emails.length = 0
  })

  it('includes Campaign membership World access without granting general World information', async () => {
    const actor = await createUser('actor')
    const owner = await createUser('owner')
    const worldId = id()
    const timelineId = id()
    const campaignId = id()

    await prisma.world.create({
      data: {
        id: worldId,
        name: 'Campaign-only World',
        description:
          'Owner and World members can read this basic World description.',
        ownerId: owner.id,
      },
    })
    await prisma.worldTimeline.create({
      data: { id: timelineId, worldId, name: 'Main' },
    })
    await prisma.campaign.create({
      data: {
        id: campaignId,
        name: 'Visible Campaign',
        worldId,
        ownerId: owner.id,
        timelineId,
        currentWorldPosition: '10',
        currentWorldDateLabel: 'Year 10',
      },
    })
    await prisma.campaignMembership.create({
      data: {
        id: id(),
        campaignId,
        userId: actor.id,
        role: 'PLAYER',
      },
    })

    const choices = await listWorldNavigationChoices(actor.id)
    expect(choices).toEqual([
      expect.objectContaining({
        id: worldId,
        accessKind: 'CAMPAIGN_ONLY',
        canWeave: false,
      }),
    ])

    const overview = await getWorldOverview(worldId, actor.id)
    expect(overview).toMatchObject({
      id: worldId,
      accessKind: 'CAMPAIGN_ONLY',
      description: null,
      canEditBasicInfo: false,
      hasFullWorldAccess: false,
      campaigns: [{ id: campaignId, name: 'Visible Campaign', role: 'PLAYER' }],
    })
  })

  it('allows a World ADMIN to edit basic information and enter as Weaver', async () => {
    const actor = await createUser('admin')
    const owner = await createUser('owner2')
    const worldId = id()

    await prisma.world.create({
      data: {
        id: worldId,
        name: 'Admin World',
        description: 'Visible to World members.',
        ownerId: owner.id,
      },
    })
    await prisma.worldMembership.create({
      data: {
        id: id(),
        worldId,
        userId: actor.id,
        role: 'ADMIN',
      },
    })

    const choices = await listWorldNavigationChoices(actor.id)
    expect(choices[0]).toMatchObject({
      id: worldId,
      accessKind: 'ADMIN',
      canWeave: true,
    })

    const overview = await getWorldOverview(worldId, actor.id)
    expect(overview).toMatchObject({
      accessKind: 'ADMIN',
      description: 'Visible to World members.',
      canEditBasicInfo: true,
      hasFullWorldAccess: true,
    })
  })
})
