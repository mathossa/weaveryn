import { describe, expect, it } from 'vitest'
import { WorldEntityService } from './world-entity-service'
import type {
  EntityRelationshipRecord,
  WorldEntityRecord,
  WorldEntityRepository,
  WorldEntityVisibilityQuery,
} from './world-entity-repository'

const worldId = '41000000-0000-4000-8000-000000000010'
const ownerId = '41000000-0000-4000-8000-000000000001'
const memberId = '41000000-0000-4000-8000-000000000002'
const otherUserId = '41000000-0000-4000-8000-000000000003'
const entityId = '41000000-0000-4000-8000-000000000020'
const targetEntityId = '41000000-0000-4000-8000-000000000021'
const relationshipId = '41000000-0000-4000-8000-000000000040'
const privateRelationshipId = '41000000-0000-4000-8000-000000000041'
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
    createdById: memberId,
    visibilityScope: 'WORLD',
    visibilityCampaignId: null,
    visibilityUserId: null,
    createdAt: now,
    updatedAt: now,
  }
}

function relationship(
  id: string,
  sourceEntityId: string,
  targetId: string,
  visibilityScope: 'WORLD' | 'PRIVATE',
  createdById: string,
): EntityRelationshipRecord {
  return {
    id,
    worldId,
    sourceEntityId,
    targetEntityId: targetId,
    relationshipType: 'CONNECTED_TO',
    label: null,
    metadata: {},
    createdById,
    visibilityScope,
    visibilityCampaignId: null,
    visibilityUserId: null,
    createdAt: now,
    updatedAt: now,
  }
}

describe('WorldEntityService visible list optimization', () => {
  it('uses the repository visibility query and keeps the service filter fail-closed', async () => {
    let visibilityQuery: WorldEntityVisibilityQuery | undefined
    let fallbackListCalls = 0
    const unauthorizedPrivate: WorldEntityRecord = {
      id: entityId,
      worldId,
      type: 'location',
      name: 'Other private draft',
      description: null,
      image: null,
      imageFocusX: 50,
      imageFocusY: 50,
      data: {},
      createdById: otherUserId,
      visibilityScope: 'PRIVATE',
      visibilityCampaignId: null,
      visibilityUserId: null,
      createdAt: now,
      updatedAt: now,
    }

    const repository = {
      findWorldById: async () => ({ id: worldId, ownerId }),
      findMembership: async () => ({
        id: '41000000-0000-4000-8000-000000000030',
        worldId,
        userId: memberId,
        role: 'MEMBER' as const,
        joinedAt: now,
        updatedAt: now,
      }),
      listCampaignAccesses: async () => [],
      listVisibleEntities: async (
        _worldId: string,
        visibility: WorldEntityVisibilityQuery,
      ) => {
        visibilityQuery = visibility
        return [unauthorizedPrivate]
      },
      listEntities: async () => {
        fallbackListCalls += 1
        return [unauthorizedPrivate]
      },
    } as unknown as WorldEntityRepository

    const service = new WorldEntityService(repository)

    await expect(service.listEntities(worldId, memberId)).resolves.toEqual([])
    expect(visibilityQuery).toEqual({
      userId: memberId,
      hasWorldAccess: true,
      campaignIds: [],
      gmCampaignIds: [],
    })
    expect(fallbackListCalls).toBe(0)
  })

  it('uses optimized relationship and entity queries while rechecking visibility and endpoints', async () => {
    let relationshipVisibilityQuery: WorldEntityVisibilityQuery | undefined
    let entityVisibilityQuery: WorldEntityVisibilityQuery | undefined
    let fallbackRelationshipCalls = 0
    let fallbackEntityCalls = 0

    const visibleSource = worldEntity(entityId, 'Visible source')
    const hiddenTarget = worldEntity(targetEntityId, 'Hidden target')
    const hiddenEndpointRelationship = relationship(
      relationshipId,
      visibleSource.id,
      hiddenTarget.id,
      'WORLD',
      memberId,
    )
    const unauthorizedPrivateRelationship = relationship(
      privateRelationshipId,
      visibleSource.id,
      visibleSource.id,
      'PRIVATE',
      otherUserId,
    )

    const repository = {
      findWorldById: async () => ({ id: worldId, ownerId }),
      findMembership: async () => ({
        id: '41000000-0000-4000-8000-000000000031',
        worldId,
        userId: memberId,
        role: 'MEMBER' as const,
        joinedAt: now,
        updatedAt: now,
      }),
      listCampaignAccesses: async () => [],
      listVisibleEntities: async (
        _worldId: string,
        visibility: WorldEntityVisibilityQuery,
      ) => {
        entityVisibilityQuery = visibility
        return [visibleSource]
      },
      listVisibleRelationships: async (
        _worldId: string,
        visibility: WorldEntityVisibilityQuery,
      ) => {
        relationshipVisibilityQuery = visibility
        return [hiddenEndpointRelationship, unauthorizedPrivateRelationship]
      },
      listEntities: async () => {
        fallbackEntityCalls += 1
        return [visibleSource, hiddenTarget]
      },
      listRelationships: async () => {
        fallbackRelationshipCalls += 1
        return [hiddenEndpointRelationship, unauthorizedPrivateRelationship]
      },
    } as unknown as WorldEntityRepository

    const service = new WorldEntityService(repository)

    await expect(service.listRelationships(worldId, memberId)).resolves.toEqual(
      [],
    )
    expect(entityVisibilityQuery).toEqual({
      userId: memberId,
      hasWorldAccess: true,
      campaignIds: [],
      gmCampaignIds: [],
    })
    expect(relationshipVisibilityQuery).toEqual(entityVisibilityQuery)
    expect(fallbackEntityCalls).toBe(0)
    expect(fallbackRelationshipCalls).toBe(0)
  })
})
