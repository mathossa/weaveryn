import { describe, expect, it } from 'vitest'
import { WorldEntityService } from './world-entity-service'
import type {
  CreateEntityRelationshipRecordInput,
  CreateWorldEntityRecordInput,
  EntityRelationshipRecord,
  WorldEntityRecord,
  WorldEntityRepository,
} from './world-entity-repository'

const ownerId = '30000000-0000-4000-8000-000000000001'
const worldId = '30000000-0000-4000-8000-000000000010'
const entityId = '30000000-0000-4000-8000-000000000020'
const targetOneId = '30000000-0000-4000-8000-000000000021'
const targetTwoId = '30000000-0000-4000-8000-000000000022'
const relationshipOneId = '30000000-0000-4000-8000-000000000030'
const relationshipTwoId = '30000000-0000-4000-8000-000000000031'
const now = new Date('2026-08-23T00:00:00.000Z')

function worldEntity(id: string, name: string): WorldEntityRecord {
  return {
    id,
    worldId,
    type: 'location',
    name,
    description: null,
    image: null,
    imageFocusX: 50,
    imageFocusY: 50,
    data: {},
    createdById: ownerId,
    visibilityScope: 'WORLD',
    visibilityCampaignId: null,
    visibilityUserId: null,
    createdAt: now,
    updatedAt: now,
  }
}

describe('WorldEntityService initial relationships', () => {
  it('reuses one visibility context and the created source entity', async () => {
    const calls = {
      findWorldById: 0,
      listCampaignAccesses: 0,
      findEntityById: 0,
      createRelationship: 0,
    }
    const entities = new Map<string, WorldEntityRecord>([
      [targetOneId, worldEntity(targetOneId, 'Target One')],
      [targetTwoId, worldEntity(targetTwoId, 'Target Two')],
    ])

    const repository = {
      runInTransaction: async <T>(
        operation: (repository: WorldEntityRepository) => Promise<T>,
      ) => operation(repository),
      findWorldById: async (requestedWorldId: string) => {
        calls.findWorldById += 1
        return requestedWorldId === worldId ? { id: worldId, ownerId } : null
      },
      findMembership: async () => null,
      listCampaignAccesses: async () => {
        calls.listCampaignAccesses += 1
        return []
      },
      createEntity: async (input: CreateWorldEntityRecordInput) => {
        const entity: WorldEntityRecord = {
          id: input.id,
          worldId: input.worldId,
          type: input.type,
          name: input.name,
          description: input.description ?? null,
          image: input.image ?? null,
          imageFocusX: input.imageFocusX ?? 50,
          imageFocusY: input.imageFocusY ?? 50,
          data: input.data,
          createdById: input.createdById,
          visibilityScope: input.visibilityScope,
          visibilityCampaignId: input.visibilityCampaignId ?? null,
          visibilityUserId: input.visibilityUserId ?? null,
          createdAt: now,
          updatedAt: now,
        }
        entities.set(entity.id, entity)
        return entity
      },
      findEntityById: async (requestedEntityId: string) => {
        calls.findEntityById += 1
        return entities.get(requestedEntityId) ?? null
      },
      createRelationship: async (
        input: CreateEntityRelationshipRecordInput,
      ) => {
        calls.createRelationship += 1
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
        return relationship
      },
    } as unknown as WorldEntityRepository

    const ids = [entityId, relationshipOneId, relationshipTwoId].values()
    const service = new WorldEntityService(repository, () => ids.next().value!)

    await expect(
      service.createEntity({
        actorUserId: ownerId,
        worldId,
        type: 'location',
        name: 'Source',
        initialRelationships: [
          {
            targetEntityId: targetOneId,
            relationshipType: 'CONNECTED_TO',
          },
          {
            targetEntityId: targetTwoId,
            relationshipType: 'CONNECTED_TO',
          },
        ],
      }),
    ).resolves.toMatchObject({ id: entityId, name: 'Source' })

    expect(calls.findWorldById).toBe(2)
    expect(calls.listCampaignAccesses).toBe(1)
    expect(calls.findEntityById).toBe(2)
    expect(calls.createRelationship).toBe(2)
  })
})
