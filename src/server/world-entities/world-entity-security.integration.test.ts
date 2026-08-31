import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
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

describe('World entity authorization hardening', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await prisma.worldEntity.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldEntityType.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaignMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaign.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.world.deleteMany({ where: { id: { in: ids } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    ids.length = 0
    emails.length = 0
  })

  it('requires access to the Campaign before deleting its scoped custom type', async () => {
    const worldOwner = await createUser('world-owner')
    const campaignOwner = await createUser('campaign-owner')
    const worldId = id()
    const campaignId = id()
    const typeId = id()

    await prisma.world.create({
      data: { id: worldId, name: 'Aldorath', ownerId: worldOwner.id },
    })
    await prisma.campaign.create({
      data: {
        id: campaignId,
        name: 'Hidden Ashes',
        worldId,
        ownerId: campaignOwner.id,
      },
    })
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
    const worldId = id()
    const campaignId = id()
    const typeId = id()

    await prisma.world.create({
      data: { id: worldId, name: 'Aldorath', ownerId: worldOwner.id },
    })
    await prisma.worldMembership.create({
      data: {
        id: id(),
        worldId,
        userId: member.id,
        role: 'MEMBER',
      },
    })
    await prisma.campaign.create({
      data: {
        id: campaignId,
        name: 'Hidden Ashes',
        worldId,
        ownerId: worldOwner.id,
      },
    })
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
