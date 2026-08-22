import { describe, expect, it } from 'vitest'
import { WorldEntityService } from './world-entity-service'
import type {
  WorldEntityRecord,
  WorldEntityRepository,
  WorldEntityVisibilityQuery,
} from './world-entity-repository'

const worldId = '41000000-0000-4000-8000-000000000010'
const ownerId = '41000000-0000-4000-8000-000000000001'
const memberId = '41000000-0000-4000-8000-000000000002'
const otherUserId = '41000000-0000-4000-8000-000000000003'
const entityId = '41000000-0000-4000-8000-000000000020'
const now = new Date('2026-08-23T00:00:00.000Z')

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
})
