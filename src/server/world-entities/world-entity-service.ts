import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import {
  WORLD_PERMISSIONS,
  WorldAuthorizationService,
} from '../worlds/world-permissions'
import {
  entityRelationshipCrossWorld,
  entityRelationshipNotFound,
  worldEntityNotFound,
} from './world-entity-errors'
import type {
  CreateEntityRelationshipRecordInput,
  StructuredData,
  UpdateWorldEntityRecordInput,
  WorldEntityRecord,
  WorldEntityRepository,
} from './world-entity-repository'
import { PrismaWorldEntityRepository } from './prisma-world-entity-repository'

export interface CreateWorldEntityInput {
  actorUserId: string
  worldId: string
  type: string
  name: string
  description?: string | null
  image?: string | null
  data?: StructuredData
}

export interface CreateEntityRelationshipInput {
  actorUserId: string
  worldId: string
  sourceEntityId: string
  targetEntityId: string
  relationshipType: string
  label?: string | null
  metadata?: StructuredData
}

export type WorldEntityIdFactory = () => string

function pickEntityUpdates(
  input: UpdateWorldEntityRecordInput,
): UpdateWorldEntityRecordInput {
  return {
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.image !== undefined ? { image: input.image } : {}),
    ...(input.data !== undefined ? { data: input.data } : {}),
  }
}

export class WorldEntityService {
  constructor(
    private readonly repository: WorldEntityRepository,
    private readonly createId: WorldEntityIdFactory = randomUUID,
  ) {}

  createEntity(input: CreateWorldEntityInput): Promise<WorldEntityRecord> {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        input.actorUserId,
        input.worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )

      return repository.createEntity({
        id: this.createId(),
        worldId: input.worldId,
        type: input.type,
        name: input.name,
        description: input.description,
        image: input.image,
        data: input.data ?? {},
        createdById: input.actorUserId,
      })
    })
  }

  async loadEntity(
    worldId: string,
    userId: string,
    entityId: string,
  ): Promise<WorldEntityRecord | null> {
    const authorization = new WorldAuthorizationService(this.repository)
    await authorization.assertPermission(
      userId,
      worldId,
      WORLD_PERMISSIONS.VIEW_WORLD,
    )
    return this.repository.findEntity(worldId, entityId)
  }

  async listEntities(worldId: string, userId: string) {
    const authorization = new WorldAuthorizationService(this.repository)
    await authorization.assertPermission(
      userId,
      worldId,
      WORLD_PERMISSIONS.VIEW_WORLD,
    )
    return this.repository.listEntities(worldId)
  }

  updateEntity(
    worldId: string,
    userId: string,
    entityId: string,
    input: UpdateWorldEntityRecordInput,
  ) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        userId,
        worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )

      const updated = await repository.updateEntity(
        worldId,
        entityId,
        pickEntityUpdates(input),
      )
      if (!updated) throw worldEntityNotFound(entityId)
      return updated
    })
  }

  deleteEntity(worldId: string, userId: string, entityId: string) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        userId,
        worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )

      if (!(await repository.deleteEntity(worldId, entityId))) {
        throw worldEntityNotFound(entityId)
      }
    })
  }

  createRelationship(input: CreateEntityRelationshipInput) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        input.actorUserId,
        input.worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )

      const [source, target] = await Promise.all([
        repository.findEntityById(input.sourceEntityId),
        repository.findEntityById(input.targetEntityId),
      ])

      if (!source) throw worldEntityNotFound(input.sourceEntityId)
      if (!target) throw worldEntityNotFound(input.targetEntityId)
      if (
        source.worldId !== input.worldId ||
        target.worldId !== input.worldId
      ) {
        throw entityRelationshipCrossWorld()
      }

      const relationship: CreateEntityRelationshipRecordInput = {
        id: this.createId(),
        worldId: input.worldId,
        sourceEntityId: input.sourceEntityId,
        targetEntityId: input.targetEntityId,
        relationshipType: input.relationshipType,
        label: input.label,
        metadata: input.metadata ?? {},
      }
      return repository.createRelationship(relationship)
    })
  }

  async listRelationships(worldId: string, userId: string) {
    const authorization = new WorldAuthorizationService(this.repository)
    await authorization.assertPermission(
      userId,
      worldId,
      WORLD_PERMISSIONS.VIEW_WORLD,
    )
    return this.repository.listRelationships(worldId)
  }

  deleteRelationship(
    worldId: string,
    userId: string,
    relationshipId: string,
  ) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        userId,
        worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )

      if (!(await repository.deleteRelationship(worldId, relationshipId))) {
        throw entityRelationshipNotFound(relationshipId)
      }
    })
  }
}

export const worldEntityService = new WorldEntityService(
  new PrismaWorldEntityRepository(prisma),
)
