import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
import { deleteWorldEntityType } from './world-entity-ui-service'
import { worldEntityService } from './world-entity-service'

const worldIds: string[] = []
const campaignIds: string[] = []
const emails: string[] = []

async function createUser(label: string) {
  const email = `world-entity-${label}-${randomUUID()}@weaveryn.local`
  emails.push(email)
  return prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      username: `world_entity_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      displayName: `World Entity ${label}`,
    },
  })
}

async function createWorldFixture() {
  const owner = await createUser('owner')
  const member = await createUser('member')
  const viewer = await createUser('viewer')
  const player = await createUser('campaign-player')
  const worldId = randomUUID()
  const timelineId = randomUUID()
  const campaignId = randomUUID()
  worldIds.push(worldId)
  campaignIds.push(campaignId)

  await prisma.world.create({
    data: {
      id: worldId,
      name: 'Entity Visibility Integration World',
      ownerId: owner.id,
      memberships: {
        create: [
          { id: randomUUID(), userId: member.id, role: 'MEMBER' },
          { id: randomUUID(), userId: viewer.id, role: 'VIEWER' },
        ],
      },
    },
  })
  await prisma.worldTimeline.create({
    data: { id: timelineId, worldId, name: 'Main' },
  })
  await prisma.campaign.create({
    data: {
      id: campaignId,
      name: 'Entity Visibility Campaign',
      worldId,
      ownerId: owner.id,
      timelineId,
      currentWorldPosition: '1',
      currentWorldDateLabel: 'Day 1',
      memberships: {
        create: [
          { id: randomUUID(), userId: owner.id, role: 'GM' },
          { id: randomUUID(), userId: player.id, role: 'PLAYER' },
        ],
      },
    },
  })

  return { owner, member, viewer, player, worldId, campaignId }
}

describe('World entity MVP visibility', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await prisma.campaign.deleteMany({ where: { id: { in: campaignIds } } })
    await prisma.world.deleteMany({ where: { id: { in: worldIds } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    worldIds.length = 0
    campaignIds.length = 0
    emails.length = 0
  })

  it('filters all five MVP scopes and preserves Campaign-only access boundaries', async () => {
    const { owner, member, viewer, player, worldId, campaignId } =
      await createWorldFixture()

    const worldEntity = await worldEntityService.createEntity({
      actorUserId: owner.id,
      worldId,
      type: 'location',
      name: 'World Plaza',
    })
    const campaignEntity = await worldEntityService.createEntity({
      actorUserId: owner.id,
      worldId,
      contextCampaignId: campaignId,
      type: 'location',
      name: 'Campaign Camp',
    })
    const campaignEntityTwo = await worldEntityService.createEntity({
      actorUserId: owner.id,
      worldId,
      contextCampaignId: campaignId,
      type: 'item',
      name: 'Campaign Ledger',
    })
    const gmEntity = await worldEntityService.createEntity({
      actorUserId: owner.id,
      worldId,
      type: 'person',
      name: 'GM Secret',
      visibility: { scope: 'GM', campaignId },
    })
    const playerEntity = await worldEntityService.createEntity({
      actorUserId: owner.id,
      worldId,
      type: 'item',
      name: 'Player Secret',
      visibility: { scope: 'PLAYER', campaignId, userId: player.id },
    })
    const privateEntity = await worldEntityService.createEntity({
      actorUserId: member.id,
      worldId,
      type: 'person',
      name: 'Private Draft',
      visibility: { scope: 'PRIVATE' },
    })

    expect(worldEntity.visibilityScope).toBe('WORLD')
    expect(campaignEntity).toMatchObject({
      visibilityScope: 'CAMPAIGN',
      visibilityCampaignId: campaignId,
    })

    expect(
      (await worldEntityService.listEntities(worldId, viewer.id)).map(
        (entity) => entity.name,
      ),
    ).toEqual(['World Plaza'])
    expect(
      (await worldEntityService.listEntities(worldId, player.id))
        .map((entity) => entity.name)
        .sort(),
    ).toEqual(['Campaign Camp', 'Campaign Ledger', 'Player Secret'].sort())
    expect(
      await worldEntityService.loadEntity(worldId, player.id, gmEntity.id),
    ).toBeNull()
    expect(
      await worldEntityService.loadEntity(worldId, owner.id, playerEntity.id),
    ).toBeNull()
    expect(
      await worldEntityService.loadEntity(worldId, owner.id, privateEntity.id),
    ).toBeNull()
    expect(
      await worldEntityService.loadEntity(worldId, member.id, privateEntity.id),
    ).toMatchObject({ id: privateEntity.id })

    const campaignRelationship = await worldEntityService.createRelationship({
      actorUserId: owner.id,
      worldId,
      contextCampaignId: campaignId,
      sourceEntityId: campaignEntity.id,
      targetEntityId: campaignEntityTwo.id,
      relationshipType: 'STORES',
    })
    expect(
      (await worldEntityService.listRelationships(worldId, player.id)).map(
        (relationship) => relationship.id,
      ),
    ).toContain(campaignRelationship.id)
    expect(
      (await worldEntityService.listRelationships(worldId, viewer.id)).map(
        (relationship) => relationship.id,
      ),
    ).not.toContain(campaignRelationship.id)
  })

  it('creates initial relationships atomically, persists focus, and guards custom type deletion', async () => {
    const { owner, worldId } = await createWorldFixture()

    const linked = await worldEntityService.createEntity({
      actorUserId: owner.id,
      worldId,
      type: 'location',
      name: 'Beacon Hill',
    })
    const custom = await worldEntityService.createEntity({
      actorUserId: owner.id,
      worldId,
      type: 'Astral Beacon',
      name: 'North Beacon',
      imageFocusX: 72,
      imageFocusY: 31,
      data: { height: 82, active: true },
      initialRelationships: [
        {
          targetEntityId: linked.id,
          relationshipType: 'LOCATED_AT',
          label: 'Hilltop position',
        },
      ],
    })

    expect(custom).toMatchObject({ imageFocusX: 72, imageFocusY: 31 })
    const relationship = await prisma.entityRelationship.findFirstOrThrow({
      where: { sourceEntityId: custom.id, targetEntityId: linked.id },
    })
    expect(relationship).toMatchObject({
      relationshipType: 'LOCATED_AT',
      label: 'Hilltop position',
    })

    const customType = (
      await worldEntityService.listEntityTypes(worldId, owner.id)
    ).find((type) => type.value === 'Astral Beacon')
    expect(customType).toMatchObject({ scope: 'WORLD', usageCount: 1 })
    expect(customType?.id).toBeTruthy()

    await expect(
      deleteWorldEntityType(worldId, owner.id, customType!.id!),
    ).rejects.toMatchObject({ code: 'WORLD_ENTITY_TYPE_IN_USE' })

    await worldEntityService.deleteEntity(worldId, owner.id, custom.id)

    expect(
      await prisma.worldEntity.findUnique({ where: { id: linked.id } }),
    ).not.toBeNull()
    expect(
      await prisma.entityRelationship.findUnique({
        where: { id: relationship.id },
      }),
    ).toBeNull()

    await deleteWorldEntityType(worldId, owner.id, customType!.id!)
    expect(
      await prisma.worldEntityType.findUnique({
        where: { id: customType!.id! },
      }),
    ).toBeNull()
  })
})
