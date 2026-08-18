import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import type { WorldMembershipRecord } from '../worlds/world-membership-repository'
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

type Db = PrismaClient | Prisma.TransactionClient

const worldCharacterInclude = {
  worldCharacter: {
    include: {
      character: { select: { name: true, image: true } },
      campaignCharacters: { select: { campaignId: true } },
    },
  },
} satisfies Prisma.WorldEntityInclude

type WorldEntityWithCharacter = Prisma.WorldEntityGetPayload<{
  include: typeof worldCharacterInclude
}>

function toEntity(value: WorldEntityWithCharacter): WorldEntityRecord {
  const worldCharacter = value.worldCharacter
  return {
    id: value.id,
    worldId: value.worldId,
    type: value.type,
    name: worldCharacter
      ? worldCharacter.nameOverride?.trim() || worldCharacter.character.name
      : value.name,
    description: value.description,
    image: worldCharacter ? worldCharacter.character.image : value.image,
    imageFocusX: value.imageFocusX,
    imageFocusY: value.imageFocusY,
    data: value.data,
    worldCharacterId: value.worldCharacterId,
    worldCharacterCampaignIds:
      worldCharacter?.campaignCharacters.map(
        (participation) => participation.campaignId,
      ) ?? [],
    createdById: value.createdById,
    visibilityScope: value.visibilityScope,
    visibilityCampaignId: value.visibilityCampaignId,
    visibilityUserId: value.visibilityUserId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

const toRelationship = (
  value: EntityRelationshipRecord,
): EntityRelationshipRecord => value
const toEntityType = (value: WorldEntityTypeRecord): WorldEntityTypeRecord =>
  value

function toCampaignAccess(value: {
  id: string
  worldId: string | null
  ownerId: string
  memberships: { role: CampaignVisibilityAccessRecord['membershipRole'] }[]
}): CampaignVisibilityAccessRecord {
  return {
    id: value.id,
    worldId: value.worldId,
    ownerId: value.ownerId,
    membershipRole: value.memberships[0]?.role ?? null,
  }
}

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
          visibilityCampaignId: input.visibilityCampaignId ?? null,
          visibilityUserId: input.visibilityUserId ?? null,
          data: input.data as Prisma.InputJsonValue,
        },
        include: worldCharacterInclude,
      }),
    )
  }

  findEntity(worldId: string, entityId: string) {
    return this.db.worldEntity
      .findFirst({
        where: { id: entityId, worldId },
        include: worldCharacterInclude,
      })
      .then((value) => (value ? toEntity(value) : null))
  }

  findEntityById(entityId: string) {
    return this.db.worldEntity
      .findUnique({
        where: { id: entityId },
        include: worldCharacterInclude,
      })
      .then((value) => (value ? toEntity(value) : null))
  }

  async listEntities(worldId: string) {
    return (
      await this.db.worldEntity.findMany({
        where: { worldId },
        include: worldCharacterInclude,
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
            include: worldCharacterInclude,
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
          visibilityCampaignId: input.visibilityCampaignId ?? null,
          visibilityUserId: input.visibilityUserId ?? null,
          metadata: input.metadata as Prisma.InputJsonValue,
        },
      }),
    )
  }

  findRelationship(worldId: string, relationshipId: string) {
    return this.db.entityRelationship
      .findFirst({ where: { id: relationshipId, worldId } })
      .then((value) => (value ? toRelationship(value) : null))
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

  async findAccessibleCampaign(campaignId: string, userId: string) {
    const campaign = await this.db.campaign.findFirst({
      where: {
        id: campaignId,
        OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
      },
      select: {
        id: true,
        worldId: true,
        ownerId: true,
        memberships: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    })
    return campaign ? toCampaignAccess(campaign) : null
  }

  async listCampaignAccesses(worldId: string, userId: string) {
    return (
      await this.db.campaign.findMany({
        where: {
          worldId,
          OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
        },
        select: {
          id: true,
          worldId: true,
          ownerId: true,
          memberships: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      })
    ).map(toCampaignAccess)
  }

  async userExists(userId: string) {
    return Boolean(
      await this.db.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
    )
  }

  async upsertWorldEntityType(input: CreateWorldEntityTypeRecordInput) {
    return toEntityType(
      await this.db.worldEntityType.upsert({
        where: {
          worldId_scopeKey_normalizedName: {
            worldId: input.worldId,
            scopeKey: input.scopeKey,
            normalizedName: input.normalizedName,
          },
        },
        update: { name: input.name },
        create: {
          ...input,
          campaignId: input.campaignId ?? null,
        },
      }),
    )
  }

  async listWorldEntityTypes(worldId: string, campaignId?: string) {
    return (
      await this.db.worldEntityType.findMany({
        where: {
          worldId,
          ...(campaignId
            ? { OR: [{ campaignId: null }, { campaignId }] }
            : { campaignId: null }),
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      })
    ).map(toEntityType)
  }
}
