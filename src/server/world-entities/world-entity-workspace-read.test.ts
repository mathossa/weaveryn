import { describe, expect, it } from 'vitest'
import { WorldEntityService } from './world-entity-service'
import type {
  CampaignVisibilityAccessRecord,
  EntityRelationshipRecord,
  WorldEntityRecord,
  WorldEntityRepository,
  WorldEntityTypeRecord,
} from './world-entity-repository'

const worldId = '20000000-0000-4000-8000-000000000001'
const ownerId = '20000000-0000-4000-8000-000000000002'
const entityOneId = '20000000-0000-4000-8000-000000000003'
const entityTwoId = '20000000-0000-4000-8000-000000000004'
const relationshipId = '20000000-0000-4000-8000-000000000005'
const typeId = '20000000-0000-4000-8000-000000000006'
const now = new Date('2026-08-21T00:00:00.000Z')

function worldEntity(id: string, type: string): WorldEntityRecord {
  return {
    id,
    worldId,
    type,
    name: id,
    description: null,
    image: null,
    data: {},
    createdById: ownerId,
    visibilityScope: 'WORLD',
    visibilityCampaignId: null,
    visibilityUserId: null,
    createdAt: now,
    updatedAt: now,
  }
}

describe('WorldEntityService.readWorkspace', () => {
  it('reuses one visibility context and one entity load for the full workspace read', async () => {
    const entities = [
      worldEntity(entityOneId, 'Astral Beacon'),
      worldEntity(entityTwoId, 'location'),
    ]
    const relationships: EntityRelationshipRecord[] = [
      {
        id: relationshipId,
        worldId,
        sourceEntityId: entityOneId,
        targetEntityId: entityTwoId,
        relationshipType: 'POINTS_TO',
        label: null,
        metadata: {},
        createdById: ownerId,
        visibilityScope: 'WORLD',
        visibilityCampaignId: null,
        visibilityUserId: null,
        createdAt: now,
        updatedAt: now,
      },
    ]
    const customTypes: WorldEntityTypeRecord[] = [
      {
        id: typeId,
        worldId,
        campaignId: null,
        scopeKey: 'WORLD',
        name: 'Astral Beacon',
        normalizedName: 'astral beacon',
        createdById: ownerId,
        createdAt: now,
        updatedAt: now,
      },
    ]
    const calls = {
      findWorldById: 0,
      listCampaignAccesses: 0,
      listEntities: 0,
      listRelationships: 0,
      listWorldEntityTypes: 0,
    }

    const repository = {
      async findWorldById(requestedWorldId: string) {
        calls.findWorldById += 1
        return requestedWorldId === worldId ? { id: worldId, ownerId } : null
      },
      async listCampaignAccesses(): Promise<CampaignVisibilityAccessRecord[]> {
        calls.listCampaignAccesses += 1
        return []
      },
      async listEntities(requestedWorldId: string) {
        calls.listEntities += 1
        return requestedWorldId === worldId ? entities : []
      },
      async listRelationships(requestedWorldId: string) {
        calls.listRelationships += 1
        return requestedWorldId === worldId ? relationships : []
      },
      async listWorldEntityTypes(requestedWorldId: string) {
        calls.listWorldEntityTypes += 1
        return requestedWorldId === worldId ? customTypes : []
      },
    } as unknown as WorldEntityRepository

    const service = new WorldEntityService(repository)
    const workspace = await service.readWorkspace(worldId, ownerId)

    expect(workspace.entities).toEqual(entities)
    expect(workspace.relationships).toEqual(relationships)
    expect(workspace.entityTypes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: typeId,
          value: 'Astral Beacon',
          usageCount: 1,
        }),
      ]),
    )
    expect(calls).toEqual({
      findWorldById: 1,
      listCampaignAccesses: 1,
      listEntities: 1,
      listRelationships: 1,
      listWorldEntityTypes: 1,
    })
  })
})
