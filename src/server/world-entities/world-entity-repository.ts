import type { WorldAuthorizationRepository } from '../worlds/world-permissions'

export type StructuredData = Record<string, unknown>

export interface WorldEntityRecord {
  id: string
  worldId: string
  type: string
  name: string
  description: string | null
  image: string | null
  data: unknown
  createdById: string | null
  createdAt: Date
  updatedAt: Date
}

export interface EntityRelationshipRecord {
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

export interface CreateWorldEntityRecordInput {
  id: string
  worldId: string
  type: string
  name: string
  description?: string | null
  image?: string | null
  data: StructuredData
  createdById: string
}

export interface UpdateWorldEntityRecordInput {
  type?: string
  name?: string
  description?: string | null
  image?: string | null
  data?: StructuredData
}

export interface CreateEntityRelationshipRecordInput {
  id: string
  worldId: string
  sourceEntityId: string
  targetEntityId: string
  relationshipType: string
  label?: string | null
  metadata: StructuredData
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
  listRelationships(worldId: string): Promise<EntityRelationshipRecord[]>
  deleteRelationship(worldId: string, relationshipId: string): Promise<boolean>
}
