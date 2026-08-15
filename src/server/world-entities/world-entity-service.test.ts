import { describe, expect, it } from 'vitest'
import type { WorldRole } from '../worlds/world-role'
import { WorldEntityService } from './world-entity-service'
import type {
  CreateEntityRelationshipRecordInput,
  CreateWorldEntityRecordInput,
  EntityRelationshipRecord,
  UpdateWorldEntityRecordInput,
  WorldEntityRecord,
  WorldEntityRepository,
} from './world-entity-repository'

const ownerId = '20000000-0000-4000-8000-000000000001'
const memberId = '20000000-0000-4000-8000-000000000002'
const viewerId = '20000000-0000-4000-8000-000000000003'
const outsiderId = '20000000-0000-4000-8000-000000000004'
const worldOneId = '20000000-0000-4000-8000-000000000010'
const worldTwoId = '20000000-0000-4000-8000-000000000011'
const entityOneId = '20000000-0000-4000-8000-000000000020'
const entityTwoId = '20000000-0000-4000-8000-000000000021'
const entityThreeId = '20000000-0000-4000-8000-000000000022'
const relationshipId = '20000000-0000-4000-8000-000000000030'
const rejectedRelationshipId = '20000000-0000-4000-8000-000000000031'
const now = new Date('2026-08-15T00:00:00.000Z')

class Repository implements WorldEntityRepository {
  worlds = new Map([
    [worldOneId, { id: worldOneId, ownerId }],
    [worldTwoId, { id: worldTwoId, ownerId }],
  ])
  memberships = new Map<string, WorldRole>([
    [`${worldOneId}:${memberId}`, 'MEMBER'],
    [`${worldOneId}:${viewerId}`, 'VIEWER'],
  ])
  entities = new Map<string, WorldEntityRecord>()
  relationships = new Map<string, EntityRelationshipRecord>()

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
    for (const relationship of this.relationships.values()) {
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
      createdAt: now,
      updatedAt: now,
    }
    this.relationships.set(relationship.id, relationship)
    return relationship
  }

  async listRelationships(worldId: string) {
    return [...this.relationships.values()].filter(
      (relationship) => relationship.worldId === worldId,
    )
  }

  async deleteRelationship(worldId: string, relationshipId: string) {
    const relationship = this.relationships.get(relationshipId)
    if (!relationship || relationship.worldId !== worldId) return false
    this.relationships.delete(relationshipId)
    return true
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
  it('creates, loads, lists, updates, and deletes World entities with World authorization', async () => {
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

    expect(ownerEntity.createdById).toBe(ownerId)
    expect(memberEntity.createdById).toBe(memberId)
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
      worldId: worldOneId,
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

    await expect(
      service.deleteEntity(worldOneId, ownerId, memberEntity.id),
    ).resolves.toBeUndefined()
    expect(repository.entities.has(memberEntity.id)).toBe(false)
  })

  it('allows only same-World relationships and deletes a relationship without deleting either entity', async () => {
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

    await expect(
      service.deleteRelationship(worldOneId, memberId, relationship.id),
    ).resolves.toBeUndefined()
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
