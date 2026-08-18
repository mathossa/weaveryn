import type { CampaignRole } from '../campaigns/campaign-role'
import type { WorldAuthorizationRepository } from '../worlds/world-permissions'

export type StructuredData = Record<string, unknown>

export type VisibilityScope = 'WORLD' | 'CAMPAIGN' | 'GM' | 'PLAYER' | 'PRIVATE'

export interface VisibilityRecord {
  visibilityScope: VisibilityScope
  visibilityCampaignId: string | null
  visibilityUserId: string | null
  createdById: string | null
}

export interface WorldEntityRecord extends VisibilityRecord {
  id: string
  worldId: string
  type: string
  name: string
  description: string | null
  image: string | null
  data: unknown
  createdAt: Date
  updatedAt: Date
}

export interface EntityRelationshipRecord extends VisibilityRecord {
  id: string
  worldId: string
  sourceEntityId: string
  targetEntityId: string
  relationshipType: string
  label: string | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}

export interface WorldEntityTypeRecord {
  id: string
  worldId: string
  campaignId: string | null
  scopeKey: string
  name: string
  normalizedName: string
  createdById: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CampaignVisibilityAccessRecord {
  id: string
  worldId: string | null
  ownerId: string
  membershipRole: CampaignRole | null
}

export interface CreateWorldEntityRecordInput {
  id: string
  worldId: string
  type: string
  name: string
  description?: string | null
  image?: string | null
  data: StructuredData
  createdById: string
  visibilityScope: VisibilityScope
  visibilityCampaignId?: string | null
  visibilityUserId?: string | null
}

export interface UpdateWorldEntityRecordInput {
  type?: string
  name?: string
  description?: string | null
  image?: string | null
  data?: StructuredData
  visibilityScope?: VisibilityScope
  visibilityCampaignId?: string | null
  visibilityUserId?: string | null
}

export interface CreateEntityRelationshipRecordInput {
  id: string
  worldId: string
  sourceEntityId: string
  targetEntityId: string
  relationshipType: string
  label?: string | null
  metadata: StructuredData
  createdById: string
  visibilityScope: VisibilityScope
  visibilityCampaignId?: string | null
  visibilityUserId?: string | null
}

export interface CreateWorldEntityTypeRecordInput {
  id: string
  worldId: string
  campaignId?: string | null
  scopeKey: string
  name: string
  normalizedName: string
  createdById: string
}

export interface WorldEntityRepository extends WorldAuthorizationRepository {
  runInTransaction<T>(
    operation: (repository: WorldEntityRepository) => Promise<T>,
  ): Promise<T>
  createEntity(input: CreateWorldEntityRecordInput): Promise<WorldEntityRecord>
  findEntity(
    worldId: string,
    entityId: string,
  ): Promise<WorldEntityRecord | null>
  findEntityById(entityId: string): Promise<WorldEntityRecord | null>
  listEntities(worldId: string): Promise<WorldEntityRecord[]>
  updateEntity(
    worldId: string,
    entityId: string,
    input: UpdateWorldEntityRecordInput,
  ): Promise<WorldEntityRecord | null>
  deleteEntity(worldId: string, entityId: string): Promise<boolean>
  createRelationship(
    input: CreateEntityRelationshipRecordInput,
  ): Promise<EntityRelationshipRecord>
  findRelationship(
    worldId: string,
    relationshipId: string,
  ): Promise<EntityRelationshipRecord | null>
  listRelationships(worldId: string): Promise<EntityRelationshipRecord[]>
  deleteRelationship(worldId: string, relationshipId: string): Promise<boolean>
  findAccessibleCampaign(
    campaignId: string,
    userId: string,
  ): Promise<CampaignVisibilityAccessRecord | null>
  listCampaignAccesses(
    worldId: string,
    userId: string,
  ): Promise<CampaignVisibilityAccessRecord[]>
  userExists(userId: string): Promise<boolean>
  createWorldEntityType(
    input: CreateWorldEntityTypeRecordInput,
  ): Promise<WorldEntityTypeRecord>
  findWorldEntityType(
    worldId: string,
    scopeKey: string,
    normalizedName: string,
  ): Promise<WorldEntityTypeRecord | null>
  listWorldEntityTypes(
    worldId: string,
    campaignId?: string,
  ): Promise<WorldEntityTypeRecord[]>
}
