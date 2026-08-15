import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import type { WorldMembershipRecord } from '../worlds/world-membership-repository'
import type {
  CreateEntityRelationshipRecordInput,
  CreateWorldEntityRecordInput,
  EntityRelationshipRecord,
  UpdateWorldEntityRecordInput,
  WorldEntityRecord,
  WorldEntityRepository,
} from './world-entity-repository'

type Db = PrismaClient | Prisma.TransactionClient

const toEntity = (value: WorldEntityRecord): WorldEntityRecord => value
const toRelationship = (
  value: EntityRelationshipRecord,
): EntityRelationshipRecord => value

export class PrismaWorldEntityRepository implements WorldEntityRepository {
  constructor(
    private readonly root: PrismaClient,
    private readonly db: Db = root,
  ) {}

  runInTransaction<T>(
    operation: (repository: WorldEntityRepository) => Promise<T>,
  ): Promise<T> {
    return this.root.$transaction((tx) =>
      operation(new PrismaWorldEntityRepository(this.root, tx)),
    )
  }

  findWorldById(worldId: string) {
    return this.db.world.findUnique({
      where: { id: worldId },
      select: { id: true, ownerId: true },
    })
  }

  findMembership(
    worldId: string,
    userId: string,
  ): Promise<WorldMembershipRecord | null> {
    return this.db.worldMembership.findUnique({
      where: { worldId_userId: { worldId, userId } },
    })
  }

  async createEntity(input: CreateWorldEntityRecordInput) {
    return toEntity(
      await this.db.worldEntity.create({
        data: {
          ...input,
          data: input.data as Prisma.InputJsonValue,
        },
      }),
    )
  }

  findEntity(worldId: string, entityId: string) {
    return this.db.worldEntity
      .findFirst({ where: { id: entityId, worldId } })
      .then((value) => (value ? toEntity(value) : null))
  }

  findEntityById(entityId: string) {
    return this.db.worldEntity
      .findUnique({ where: { id: entityId } })
      .then((value) => (value ? toEntity(value) : null))
  }

  async listEntities(worldId: string) {
    return (
      await this.db.worldEntity.findMany({
        where: { worldId },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      })
    ).map(toEntity)
  }

  async updateEntity(
    worldId: string,
    entityId: string,
    input: UpdateWorldEntityRecordInput,
  ) {
    const result = await this.db.worldEntity.updateMany({
      where: { id: entityId, worldId },
      data: {
        ...input,
        data: input.data as Prisma.InputJsonValue | undefined,
      },
    })
    return result.count
      ? toEntity(
          await this.db.worldEntity.findUniqueOrThrow({
            where: { id: entityId },
          }),
        )
      : null
  }

  async deleteEntity(worldId: string, entityId: string) {
    const result = await this.db.worldEntity.deleteMany({
      where: { id: entityId, worldId },
    })
    return result.count === 1
  }

  async createRelationship(input: CreateEntityRelationshipRecordInput) {
    return toRelationship(
      await this.db.entityRelationship.create({
        data: {
          ...input,
          metadata: input.metadata as Prisma.InputJsonValue,
        },
      }),
    )
  }

  async listRelationships(worldId: string) {
    return (
      await this.db.entityRelationship.findMany({
        where: { worldId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      })
    ).map(toRelationship)
  }

  async deleteRelationship(worldId: string, relationshipId: string) {
    const result = await this.db.entityRelationship.deleteMany({
      where: { id: relationshipId, worldId },
    })
    return result.count === 1
  }
}
