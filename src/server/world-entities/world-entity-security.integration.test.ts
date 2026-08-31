import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { campaignService } from '@/server/campaigns'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
import {
  deleteWorldEntityType,
  getWorldEntityTypeChoices,
} from './world-entity-ui-service'

const ids: string[] = []
const emails: string[] = []

function id() {
  const value = randomUUID()
  ids.push(value)
  return value
}

async function createUser(label: string) {
  const email = `world-entity-security-${label}-${randomUUID()}@weaveryn.local`
  emails.push(email)
  return prisma.user.create({
    data: {
      id: id(),
      email,
      username: `entity_security_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      displayName: `Entity Security ${label}`,
    },
  })
}

async function createWorld(ownerId: string) {
  const worldId = id()
  const timelineId = id()
  await prisma.world.create({
    data: { id: worldId, name: 'Aldorath', ownerId },
  })
  await prisma.worldTimeline.create({
    data: { id: timelineId, worldId, name: 'Main' },
  })
  return worldId
}

async function createCampaign(ownerId: string, worldId: string) {
  const campaign = await campaignService.createCampaign({
    creatorId: ownerId,
    worldId,
    name: 'Hidden Ashes',
    currentWorldPosition: '142.5',
    currentWorldDateLabel: '14 Emberwane, 812',
  })
  ids.push(campaign.id)
  return campaign.id
}

describe('World entity authorization hardening', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await prisma.worldEntity.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldEntityType.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaignMembership.deleteMany({
      where: {
        OR: [{ id: { in: ids } }, { campaignId: { in: ids } }],
      },
    })
    await prisma.campaign.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldTimeline.deleteMany({ where: { id: { in: ids } } })
    await prisma.world.deleteMany({ where: { id: { in: ids } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    ids.length = 0
    emails.length = 0
  })

  it('requires access to the Campaign before deleting its scoped custom type', async () => {
    const worldOwner = await createUser('world-owner')
    const campaignOwner = await createUser('campaign-owner')
    const worldId = await createWorld(worldOwner.id)
    const typeId = id()

    await prisma.worldMembership.create({
      data: {
        id: id(),
        worldId,
        userId: campaignOwner.id,
        role: 'MEMBER',
      },
    })
    const campaignId = await createCampaign(campaignOwner.id, worldId)

    await prisma.worldEntityType.create({
      data: {
        id: typeId,
        worldId,
        campaignId,
        scopeKey: campaignId,
        name: 'Secret Sign',
        normalizedName: 'secret sign',
        createdById: campaignOwner.id,
      },
    })

    await expect(
      deleteWorldEntityType(worldId, worldOwner.id, typeId),
    ).rejects.toMatchObject({ code: 'WORLD_ENTITY_TYPE_NOT_FOUND' })
    await expect(
      prisma.worldEntityType.findUnique({ where: { id: typeId } }),
    ).resolves.toMatchObject({ id: typeId })

    await prisma.campaignMembership.create({
      data: {
        id: id(),
        campaignId,
        userId: worldOwner.id,
        role: 'PLAYER',
      },
    })

    await expect(
      deleteWorldEntityType(worldId, worldOwner.id, typeId),
    ).resolves.toBeUndefined()
    await expect(
      prisma.worldEntityType.findUnique({ where: { id: typeId } }),
    ).resolves.toBeNull()
  })

  it('reports custom type usage from visible entities only and does not disclose hidden counts on delete', async () => {
    const worldOwner = await createUser('owner')
    const member = await createUser('member')
    const worldId = await createWorld(worldOwner.id)
    const typeId = id()

    await prisma.worldMembership.create({
      data: {
        id: id(),
        worldId,
        userId: member.id,
        role: 'MEMBER',
      },
    })
    const campaignId = await createCampaign(worldOwner.id, worldId)

    await prisma.worldEntityType.create({
      data: {
        id: typeId,
        worldId,
        campaignId: null,
        scopeKey: 'WORLD',
        name: 'Veiled Marker',
        normalizedName: 'veiled marker',
        createdById: worldOwner.id,
      },
    })
    await prisma.worldEntity.createMany({
      data: [
        {
          id: id(),
          worldId,
          type: 'Veiled Marker',
          name: 'Public Marker',
          createdById: worldOwner.id,
          visibilityScope: 'WORLD',
        },
        {
          id: id(),
          worldId,
          type: 'Veiled Marker',
          name: 'Hidden Marker',
          createdById: worldOwner.id,
          visibilityScope: 'CAMPAIGN',
          visibilityCampaignId: campaignId,
        },
      ],
    })

    const choices = await getWorldEntityTypeChoices(worldId, member.id)
    expect(choices.find((choice) => choice.id === typeId)).toMatchObject({
      usageCount: 1,
    })

    await expect(
      deleteWorldEntityType(worldId, member.id, typeId),
    ).rejects.toMatchObject({
      code: 'WORLD_ENTITY_TYPE_IN_USE',
      message: 'Veiled Marker cannot be deleted while it is in use.',
    })
  })
})
