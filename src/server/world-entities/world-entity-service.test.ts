import { describe, expect, it } from 'vitest'
import type { CampaignRole } from '../campaigns/campaign-role'
import type { WorldRole } from '../worlds/world-role'
import { WorldEntityService } from './world-entity-service'
import type {
  CampaignVisibilityAccessRecord,
  CreateEntityRelationshipRecordInput,
  CreateWorldEntityRecordInput,
  CreateWorldEntityTypeRecordInput,
  EntityRelationshipRecord,
  UpdateWorldEntityRecordInput,
  WorldEntityRecord,
  WorldEntityRepository,
  WorldEntityTypeRecord,
} from './world-entity-repository'

const ownerId = '20000000-0000-4000-8000-000000000001'
const memberId = '20000000-0000-4000-8000-000000000002'
const viewerId = '20000000-0000-4000-8000-000000000003'
const outsiderId = '20000000-0000-4000-8000-000000000004'
const campaignPlayerId = '20000000-0000-4000-8000-000000000005'
const campaignGmId = '20000000-0000-4000-8000-000000000006'
const worldOneId = '20000000-0000-4000-8000-000000000010'
const worldTwoId = '20000000-0000-4000-8000-000000000011'
const campaignId = '20000000-0000-4000-8000-000000000012'
const entityOneId = '20000000-0000-4000-8000-000000000020'
const entityTwoId = '20000000-0000-4000-8000-000000000021'
const entityThreeId = '20000000-0000-4000-8000-000000000022'
const relationshipId = '20000000-0000-4000-8000-000000000030'
const rejectedRelationshipId = '20000000-0000-4000-8000-000000000031'
const typeId = '20000000-0000-4000-8000-000000000040'
const now = new Date('2026-08-15T00:00:00.000Z')

class Repository implements WorldEntityRepository {
  worlds = new Map([
    [worldOneId, { id: worldOneId, ownerId }],
    [worldTwoId, { id: worldTwoId, ownerId }],
  ])
  memberships = new Map<string, WorldRole>([
    [`${worldOneId}:${memberId}`, 'MEMBER'],
    [`${worldOneId}:${viewerId}`, 'VIEWER'],
    [`${worldOneId}:${campaignGmId}`, 'MEMBER'],
  ])
  campaigns = new Map<
    string,
    {
      id: string
      worldId: string | null
      ownerId: string
      memberships: Map<string, CampaignRole>
    }
  >([
    [
      campaignId,
      {
        id: campaignId,
        worldId: worldOneId,
        ownerId,
        memberships: new Map([
          [campaignPlayerId, 'PLAYER'],
          [campaignGmId, 'GM'],
        ]),
      },
    ],
  ])
  users = new Set([
    ownerId,
    memberId,
    viewerId,
    outsiderId,
    campaignPlayerId,
    campaignGmId,
  ])
  entities = new Map<string, WorldEntityRecord>()
  relationships = new Map<string, EntityRelationshipRecord>()
  entityTypes = new Map<string, WorldEntityTypeRecord>()

  runInTransaction<T>(
    operation: (repository: WorldEntityRepository) => Promise<T>,
  ): Promise<T> {
    return operation(this)
  }

  async findWorldById(worldId: string) {
    return this.worlds.get(worldId) ?? null
  }

  async findMembership(worldId: string, userId: string) {
    const role = this.memberships.get(`${worldId}:${userId}`)
    return role
      ? {
          id: `${worldId}:${userId}`,
          worldId,
          userId,
          role,
          joinedAt: now,
          updatedAt: now,
        }
      : null
  }

  campaignAccess(
    campaignIdValue: string,
    userId: string,
  ): CampaignVisibilityAccessRecord | null {
    const campaign = this.campaigns.get(campaignIdValue)
    if (!campaign) return null
    const membershipRole = campaign.memberships.get(userId) ?? null
    if (campaign.ownerId !== userId && !membershipRole) return null
    return {
      id: campaign.id,
      worldId: campaign.worldId,
      ownerId: campaign.ownerId,
      membershipRole,
    }
  }

  async findAccessibleCampaign(campaignIdValue: string, userId: string) {
    return this.campaignAccess(campaignIdValue, userId)
  }

  async listCampaignAccesses(worldId: string, userId: string) {
    return [...this.campaigns.values()]
      .filter((campaign) => campaign.worldId === worldId)
      .map((campaign) => this.campaignAccess(campaign.id, userId))
      .filter((value): value is CampaignVisibilityAccessRecord => Boolean(value))
  }

  async userExists(userId: string) {
    return this.users.has(userId)
  }

  async createEntity(input: CreateWorldEntityRecordInput) {
    const entity: WorldEntityRecord = {
      id: input.id,
      worldId: input.worldId,
      type: input.type,
      name: input.name,
      description: input.description ?? null,
      image: input.image ?? null,
      data: input.data,
      createdById: input.createdById,
      visibilityScope: input.visibilityScope,
      visibilityCampaignId: input.visibilityCampaignId ?? null,
      visibilityUserId: input.visibilityUserId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.entities.set(entity.id, entity)
    return entity
  }

  async findEntity(worldId: string, entityId: string) {
    const entity = this.entities.get(entityId)
    return entity?.worldId === worldId ? entity : null
  }

  async findEntityById(entityId: string) {
    return this.entities.get(entityId) ?? null
  }

  async listEntities(worldId: string) {
    return [...this.entities.values()].filter(
      (entity) => entity.worldId === worldId,
    )
  }

  async updateEntity(
    worldId: string,
    entityId: string,
    input: UpdateWorldEntityRecordInput,
  ) {
    const entity = await this.findEntity(worldId, entityId)
    if (!entity) return null
    Object.assign(entity, input, { updatedAt: now })
    return entity
  }

  async deleteEntity(worldId: string, entityId: string) {
    const entity = await this.findEntity(worldId, entityId)
    if (!entity) return false
    this.entities.delete(entityId)
    for (const relationship of [...this.relationships.values()]) {
      if (
        relationship.sourceEntityId === entityId ||
        relationship.targetEntityId === entityId
      ) {
        this.relationships.delete(relationship.id)
      }
    }
    return true
  }

  async createRelationship(input: CreateEntityRelationshipRecordInput) {
    const relationship: EntityRelationshipRecord = {
      id: input.id,
      worldId: input.worldId,
      sourceEntityId: input.sourceEntityId,
      targetEntityId: input.targetEntityId,
      relationshipType: input.relationshipType,
      label: input.label ?? null,
      metadata: input.metadata,
      createdById: input.createdById,
      visibilityScope: input.visibilityScope,
      visibilityCampaignId: input.visibilityCampaignId ?? null,
      visibilityUserId: input.visibilityUserId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.relationships.set(relationship.id, relationship)
    return relationship
  }

  async findRelationship(worldId: string, relationshipIdValue: string) {
    const relationship = this.relationships.get(relationshipIdValue)
    return relationship?.worldId === worldId ? relationship : null
  }

  async listRelationships(worldId: string) {
    return [...this.relationships.values()].filter(
      (relationship) => relationship.worldId === worldId,
    )
  }

  async deleteRelationship(worldId: string, relationshipIdValue: string) {
    const relationship = await this.findRelationship(worldId, relationshipIdValue)
    if (!relationship) return false
    this.relationships.delete(relationshipIdValue)
    return true
  }

  async upsertWorldEntityType(input: CreateWorldEntityTypeRecordInput) {
    const key = `${input.worldId}:${input.scopeKey}:${input.normalizedName}`
    const existing = this.entityTypes.get(key)
    if (existing) {
      existing.name = input.name
      existing.updatedAt = now
      return existing
    }
    const entityType: WorldEntityTypeRecord = {
      ...input,
      campaignId: input.campaignId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.entityTypes.set(key, entityType)
    return entityType
  }

  async listWorldEntityTypes(worldId: string, campaignIdValue?: string) {
    return [...this.entityTypes.values()].filter(
      (entityType) =>
        entityType.worldId === worldId &&
        (entityType.campaignId === null ||
          entityType.campaignId === campaignIdValue),
    )
  }
}

function harness(ids: string[]) {
  const repository = new Repository()
  const sequence = ids.values()
  return {
    repository,
    service: new WorldEntityService(repository, () => sequence.next().value!),
  }
}

describe('WorldEntityService', () => {
  it('keeps WORLD entities readable by World members while enforcing World writes', async () => {
    const { repository, service } = harness([entityOneId, entityTwoId])

    const ownerEntity = await service.createEntity({
      actorUserId: ownerId,
      worldId: worldOneId,
      type: 'location',
      name: 'Moonwatch',
      data: { population: 2400 },
    })
    const memberEntity = await service.createEntity({
      actorUserId: memberId,
      worldId: worldOneId,
      type: 'organization',
      name: 'Lantern Guild',
    })

    expect(ownerEntity.visibilityScope).toBe('WORLD')
    await expect(
      service.loadEntity(worldOneId, viewerId, ownerEntity.id),
    ).resolves.toBe(ownerEntity)
    await expect(service.listEntities(worldOneId, viewerId)).resolves.toEqual([
      ownerEntity,
      memberEntity,
    ])

    await expect(
      service.updateEntity(worldOneId, memberId, ownerEntity.id, {
        name: 'Moonwatch Keep',
        data: { population: 2500 },
      }),
    ).resolves.toMatchObject({
      name: 'Moonwatch Keep',
      data: { population: 2500 },
      createdById: ownerId,
    })
    await expect(
      service.updateEntity(worldOneId, viewerId, ownerEntity.id, {
        name: 'Forbidden edit',
      }),
    ).rejects.toMatchObject({ code: 'WORLD_PERMISSION_DENIED' })
    await expect(
      service.loadEntity(worldOneId, outsiderId, ownerEntity.id),
    ).rejects.toMatchObject({ code: 'WORLD_PERMISSION_DENIED' })

    await service.deleteEntity(worldOneId, ownerId, memberEntity.id)
    expect(repository.entities.has(memberEntity.id)).toBe(false)
  })

  it('defaults Campaign-context creation to CAMPAIGN and supports campaign-only reads', async () => {
    const { service } = harness([entityOneId])
    const entity = await service.createEntity({
      actorUserId: ownerId,
      worldId: worldOneId,
      contextCampaignId: campaignId,
      type: 'location',
      name: 'Hidden Camp',
    })

    expect(entity).toMatchObject({
      visibilityScope: 'CAMPAIGN',
      visibilityCampaignId: campaignId,
    })
    await expect(
      service.loadEntity(worldOneId, campaignPlayerId, entity.id),
    ).resolves.toBe(entity)
    await expect(
      service.loadEntity(worldOneId, viewerId, entity.id),
    ).resolves.toBeNull()
  })

  it('enforces GM, PLAYER, and PRIVATE visibility independently from World membership', async () => {
    const { service } = harness([entityOneId, entityTwoId, entityThreeId])
    const gmEntity = await service.createEntity({
      actorUserId: ownerId,
      worldId: worldOneId,
      type: 'person',
      name: 'Secret Patron',
      visibility: { scope: 'GM', campaignId },
    })
    const playerEntity = await service.createEntity({
      actorUserId: ownerId,
      worldId: worldOneId,
      type: 'item',
      name: 'Player Clue',
      visibility: {
        scope: 'PLAYER',
        campaignId,
        userId: campaignPlayerId,
      },
    })
    const privateEntity = await service.createEntity({
      actorUserId: memberId,
      worldId: worldOneId,
      type: 'person',
      name: 'Private Draft',
      visibility: { scope: 'PRIVATE' },
    })

    await expect(
      service.loadEntity(worldOneId, campaignGmId, gmEntity.id),
    ).resolves.toBe(gmEntity)
    await expect(
      service.loadEntity(worldOneId, campaignPlayerId, gmEntity.id),
    ).resolves.toBeNull()
    await expect(
      service.loadEntity(worldOneId, campaignPlayerId, playerEntity.id),
    ).resolves.toBe(playerEntity)
    await expect(
      service.loadEntity(worldOneId, campaignGmId, playerEntity.id),
    ).resolves.toBeNull()
    await expect(
      service.loadEntity(worldOneId, memberId, privateEntity.id),
    ).resolves.toBe(privateEntity)
    await expect(
      service.loadEntity(worldOneId, ownerId, privateEntity.id),
    ).resolves.toBeNull()
  })

  it('registers free-text custom entity types in World or Campaign scope', async () => {
    const { repository, service } = harness([
      typeId,
      entityOneId,
      '20000000-0000-4000-8000-000000000041',
      entityTwoId,
    ])

    await service.createEntity({
      actorUserId: ownerId,
      worldId: worldOneId,
      type: 'Astral Beacon',
      name: 'Beacon One',
    })
    await service.createEntity({
      actorUserId: ownerId,
      worldId: worldOneId,
      contextCampaignId: campaignId,
      type: 'Campaign Rumor',
      name: 'Whisper of Ash',
    })

    expect(repository.entityTypes.size).toBe(2)
    await expect(
      service.listEntityTypes(worldOneId, ownerId, campaignId),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'Astral Beacon', scope: 'WORLD' }),
        expect.objectContaining({ value: 'Campaign Rumor', scope: 'CAMPAIGN' }),
      ]),
    )
  })

  it('allows only same-World visible relationships and deleting a relationship preserves entities', async () => {
    const { repository, service } = harness([
      entityOneId,
      entityTwoId,
      entityThreeId,
      relationshipId,
      rejectedRelationshipId,
    ])

    const source = await service.createEntity({
      actorUserId: ownerId,
      worldId: worldOneId,
      type: 'location',
      name: 'Moonwatch',
    })
    const target = await service.createEntity({
      actorUserId: ownerId,
      worldId: worldOneId,
      type: 'organization',
      name: 'Lantern Guild',
    })
    const otherWorld = await service.createEntity({
      actorUserId: ownerId,
      worldId: worldTwoId,
      type: 'location',
      name: 'Veyra',
    })

    const relationship = await service.createRelationship({
      actorUserId: memberId,
      worldId: worldOneId,
      sourceEntityId: source.id,
      targetEntityId: target.id,
      relationshipType: 'HOSTS',
      label: 'Guild headquarters',
      metadata: { since: 812 },
    })
    expect(await service.listRelationships(worldOneId, viewerId)).toEqual([
      relationship,
    ])

    await expect(
      service.createRelationship({
        actorUserId: ownerId,
        worldId: worldOneId,
        sourceEntityId: source.id,
        targetEntityId: otherWorld.id,
        relationshipType: 'CONNECTED_TO',
      }),
    ).rejects.toMatchObject({ code: 'ENTITY_RELATIONSHIP_CROSS_WORLD' })

    await service.deleteRelationship(worldOneId, memberId, relationship.id)
    expect(repository.relationships.has(relationship.id)).toBe(false)
    expect(repository.entities.has(source.id)).toBe(true)
    expect(repository.entities.has(target.id)).toBe(true)
  })

  it('returns stable domain errors for missing entity and relationship targets', async () => {
    const { service } = harness([entityOneId])

    await expect(
      service.updateEntity(worldOneId, ownerId, entityOneId, {
        name: 'Missing',
      }),
    ).rejects.toMatchObject({ code: 'WORLD_ENTITY_NOT_FOUND' })
    await expect(
      service.deleteRelationship(worldOneId, ownerId, relationshipId),
    ).rejects.toMatchObject({ code: 'ENTITY_RELATIONSHIP_NOT_FOUND' })
    await expect(
      service.createRelationship({
        actorUserId: ownerId,
        worldId: worldOneId,
        sourceEntityId: entityOneId,
        targetEntityId: entityTwoId,
        relationshipType: 'LINKED_TO',
      }),
    ).rejects.toMatchObject({ code: 'WORLD_ENTITY_NOT_FOUND' })
  })
})
