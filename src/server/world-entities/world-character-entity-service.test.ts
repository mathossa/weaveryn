import { describe, expect, it } from 'vitest'
import type { CampaignRole } from '../campaigns/campaign-role'
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

const ownerId = '21700000-0000-4000-8000-000000000001'
const playerAId = '21700000-0000-4000-8000-000000000002'
const playerBId = '21700000-0000-4000-8000-000000000003'
const worldId = '21700000-0000-4000-8000-000000000010'
const campaignAId = '21700000-0000-4000-8000-000000000020'
const campaignBId = '21700000-0000-4000-8000-000000000021'
const worldCharacterId = '21700000-0000-4000-8000-000000000030'
const characterEntityId = '21700000-0000-4000-8000-000000000031'
const npcEntityId = '21700000-0000-4000-8000-000000000032'
const createdEntityId = '21700000-0000-4000-8000-000000000033'
const relationshipId = '21700000-0000-4000-8000-000000000040'
const now = new Date('2026-08-19T00:00:00.000Z')

interface CampaignFixture {
  id: string
  worldId: string
  ownerId: string
  memberships: Map<string, CampaignRole>
}

class Repository implements WorldEntityRepository {
  entities = new Map<string, WorldEntityRecord>()
  relationships = new Map<string, EntityRelationshipRecord>()
  types = new Map<string, WorldEntityTypeRecord>()
  campaigns = new Map<string, CampaignFixture>([
    [
      campaignAId,
      {
        id: campaignAId,
        worldId,
        ownerId,
        memberships: new Map([[playerAId, 'PLAYER']]),
      },
    ],
    [
      campaignBId,
      {
        id: campaignBId,
        worldId,
        ownerId,
        memberships: new Map([[playerBId, 'PLAYER']]),
      },
    ],
  ])

  constructor() {
    this.entities.set(characterEntityId, {
      id: characterEntityId,
      worldId,
      type: 'character',
      name: 'Bodwick',
      description: null,
      image: '/bodwick.webp',
      data: {},
      worldCharacterId,
      worldCharacterCampaignIds: [campaignAId],
      createdById: playerAId,
      visibilityScope: 'WORLD',
      visibilityCampaignId: null,
      visibilityUserId: null,
      createdAt: now,
      updatedAt: now,
    })
    this.entities.set(npcEntityId, {
      id: npcEntityId,
      worldId,
      type: 'person',
      name: 'The Smith',
      description: null,
      image: null,
      data: {},
      createdById: ownerId,
      visibilityScope: 'CAMPAIGN',
      visibilityCampaignId: campaignAId,
      visibilityUserId: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  runInTransaction<T>(
    operation: (repository: WorldEntityRepository) => Promise<T>,
  ): Promise<T> {
    return operation(this)
  }

  async findWorldById(requestedWorldId: string) {
    return requestedWorldId === worldId ? { id: worldId, ownerId } : null
  }

  async findMembership() {
    return null
  }

  private campaignAccess(
    campaignId: string,
    userId: string,
  ): CampaignVisibilityAccessRecord | null {
    const campaign = this.campaigns.get(campaignId)
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

  async findAccessibleCampaign(campaignId: string, userId: string) {
    return this.campaignAccess(campaignId, userId)
  }

  async listCampaignAccesses(requestedWorldId: string, userId: string) {
    return [...this.campaigns.values()]
      .filter((campaign) => campaign.worldId === requestedWorldId)
      .map((campaign) => this.campaignAccess(campaign.id, userId))
      .filter((value): value is CampaignVisibilityAccessRecord =>
        Boolean(value),
      )
  }

  async userExists(userId: string) {
    return [ownerId, playerAId, playerBId].includes(userId)
  }

  async createEntity(input: CreateWorldEntityRecordInput) {
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
    this.entities.set(entity.id, entity)
    return entity
  }

  async findEntity(requestedWorldId: string, entityId: string) {
    const entity = this.entities.get(entityId)
    return entity?.worldId === requestedWorldId ? entity : null
  }

  async findEntityById(entityId: string) {
    return this.entities.get(entityId) ?? null
  }

  async listEntities(requestedWorldId: string) {
    return [...this.entities.values()].filter(
      (entity) => entity.worldId === requestedWorldId,
    )
  }

  async updateEntity(
    requestedWorldId: string,
    entityId: string,
    input: UpdateWorldEntityRecordInput,
  ) {
    const entity = await this.findEntity(requestedWorldId, entityId)
    if (!entity) return null
    Object.assign(entity, input, { updatedAt: now })
    return entity
  }

  async deleteEntity(requestedWorldId: string, entityId: string) {
    if (!(await this.findEntity(requestedWorldId, entityId))) return false
    return this.entities.delete(entityId)
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

  async findRelationship(requestedWorldId: string, id: string) {
    const relationship = this.relationships.get(id)
    return relationship?.worldId === requestedWorldId ? relationship : null
  }

  async listRelationships(requestedWorldId: string) {
    return [...this.relationships.values()].filter(
      (relationship) => relationship.worldId === requestedWorldId,
    )
  }

  async deleteRelationship(requestedWorldId: string, id: string) {
    if (!(await this.findRelationship(requestedWorldId, id))) return false
    return this.relationships.delete(id)
  }

  async upsertWorldEntityType(input: CreateWorldEntityTypeRecordInput) {
    const entityType: WorldEntityTypeRecord = {
      ...input,
      campaignId: input.campaignId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.types.set(entityType.id, entityType)
    return entityType
  }

  async listWorldEntityTypes() {
    return [...this.types.values()]
  }
}

function harness() {
  const repository = new Repository()
  const ids = [createdEntityId, relationshipId].values()
  return {
    repository,
    service: new WorldEntityService(repository, () => ids.next().value!),
  }
}

describe('WorldCharacter entity graph integration', () => {
  it('derives Character entity visibility from WorldCharacter Campaign participation', async () => {
    const { service } = harness()

    await expect(
      service.loadEntity(worldId, playerAId, characterEntityId),
    ).resolves.toMatchObject({ worldCharacterId })
    await expect(
      service.loadEntity(worldId, playerBId, characterEntityId),
    ).resolves.toBeNull()
    await expect(
      service.loadEntity(worldId, ownerId, characterEntityId),
    ).resolves.toMatchObject({ worldCharacterId })
  })

  it('reserves Character for WorldCharacter-backed entities', async () => {
    const { service } = harness()

    await expect(
      service.createEntity({
        actorUserId: ownerId,
        worldId,
        type: 'character',
        name: 'Fake Character',
      }),
    ).rejects.toMatchObject({ code: 'WORLD_ENTITY_CHARACTER_TYPE_RESERVED' })

    await expect(
      service.updateEntity(worldId, ownerId, npcEntityId, {
        type: 'Character',
      }),
    ).rejects.toMatchObject({ code: 'WORLD_ENTITY_CHARACTER_TYPE_RESERVED' })
  })

  it('protects Character identity while retaining normal graph relationships', async () => {
    const { repository, service } = harness()

    await expect(
      service.updateEntity(worldId, ownerId, characterEntityId, {
        name: 'Renamed outside Character',
      }),
    ).rejects.toMatchObject({ code: 'WORLD_ENTITY_CHARACTER_MANAGED' })
    await expect(
      service.deleteEntity(worldId, ownerId, characterEntityId),
    ).rejects.toMatchObject({ code: 'WORLD_ENTITY_CHARACTER_MANAGED' })

    await expect(
      service.updateEntity(worldId, ownerId, characterEntityId, {
        data: { hometown: 'Waterdeep' },
      }),
    ).resolves.toMatchObject({ data: { hometown: 'Waterdeep' } })

    const relationship = await service.createRelationship({
      actorUserId: ownerId,
      worldId,
      contextCampaignId: campaignAId,
      sourceEntityId: characterEntityId,
      targetEntityId: npcEntityId,
      relationshipType: 'KNOWS',
    })

    expect(repository.relationships.has(relationship.id)).toBe(true)
    await expect(service.listRelationships(worldId, playerAId)).resolves.toEqual([
      relationship,
    ])
    await expect(service.listRelationships(worldId, playerBId)).resolves.toEqual(
      [],
    )
  })
})
