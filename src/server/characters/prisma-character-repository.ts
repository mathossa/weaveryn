import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import type { WorldMembershipRecord } from '../worlds/world-membership-repository'
import {
  CharacterRepositoryConflictError,
  type CharacterRecord,
  type CharacterRepository,
  type CreateCharacterRecordInput,
  type CreateWorldCharacterRecordInput,
  type UpdateCharacterRecordInput,
  type UpdateWorldCharacterRecordInput,
  type WorldCharacterRecord,
} from './character-repository'

type Db = PrismaClient | Prisma.TransactionClient
const toCharacter = (value: CharacterRecord): CharacterRecord => value
const toWorldCharacter = (value: WorldCharacterRecord): WorldCharacterRecord =>
  value

function resolvedWorldCharacterName(value: {
  nameOverride: string | null
  character: { name: string }
}) {
  return value.nameOverride?.trim() || value.character.name
}

export class PrismaCharacterRepository implements CharacterRepository {
  constructor(
    private readonly root: PrismaClient,
    private readonly db: Db = root,
  ) {}

  runInTransaction<T>(
    operation: (repository: CharacterRepository) => Promise<T>,
  ): Promise<T> {
    return this.root.$transaction((tx) =>
      operation(new PrismaCharacterRepository(this.root, tx)),
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

  async createCharacter(input: CreateCharacterRecordInput) {
    return toCharacter(
      await this.db.character.create({
        data: {
          ...input,
          coreData: input.coreData as Prisma.InputJsonValue | undefined,
        },
      }),
    )
  }

  findCharacterForOwner(characterId: string, ownerUserId: string) {
    return this.db.character
      .findFirst({ where: { id: characterId, ownerUserId } })
      .then((value) => (value ? toCharacter(value) : null))
  }

  async listCharactersForOwner(ownerUserId: string) {
    return (
      await this.db.character.findMany({
        where: { ownerUserId },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      })
    ).map(toCharacter)
  }

  async updateCharacterForOwner(
    characterId: string,
    ownerUserId: string,
    input: UpdateCharacterRecordInput,
  ) {
    const result = await this.db.character.updateMany({
      where: { id: characterId, ownerUserId },
      data: {
        ...input,
        coreData: input.coreData as Prisma.InputJsonValue | undefined,
      },
    })
    return result.count
      ? toCharacter(
          await this.db.character.findUniqueOrThrow({
            where: { id: characterId },
          }),
        )
      : null
  }

  async createWorldCharacter(input: CreateWorldCharacterRecordInput) {
    try {
      return toWorldCharacter(
        await this.db.worldCharacter.create({
          data: {
            ...input,
            worldData: input.worldData as Prisma.InputJsonValue | undefined,
          },
        }),
      )
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new CharacterRepositoryConflictError()
      }
      throw error
    }
  }

  findWorldCharacterForOwner(id: string, ownerUserId: string) {
    return this.db.worldCharacter
      .findFirst({ where: { id, character: { ownerUserId } } })
      .then((value) => (value ? toWorldCharacter(value) : null))
  }

  async listWorldCharactersForOwner(characterId: string, ownerUserId: string) {
    return (
      await this.db.worldCharacter.findMany({
        where: { characterId, character: { ownerUserId } },
        orderBy: { id: 'asc' },
      })
    ).map(toWorldCharacter)
  }

  async updateWorldCharacterForOwner(
    id: string,
    ownerUserId: string,
    input: UpdateWorldCharacterRecordInput,
  ) {
    const result = await this.db.worldCharacter.updateMany({
      where: { id, character: { ownerUserId } },
      data: {
        ...input,
        worldData: input.worldData as Prisma.InputJsonValue | undefined,
      },
    })
    return result.count
      ? toWorldCharacter(
          await this.db.worldCharacter.findUniqueOrThrow({ where: { id } }),
        )
      : null
  }

  async hasCampaignMembershipInWorld(worldId: string, userId: string) {
    return (
      (await this.db.campaign.count({
        where: {
          worldId,
          OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
        },
      })) > 0
    )
  }

  async hasCampaignCharacterParticipation(worldCharacterId: string) {
    return (
      (await this.db.campaignCharacter.count({ where: { worldCharacterId } })) >
      0
    )
  }

  async createWorldCharacterEntity(worldCharacterId: string, entityId: string) {
    const worldCharacter = await this.db.worldCharacter.findUnique({
      where: { id: worldCharacterId },
      include: { character: true },
    })
    if (!worldCharacter) {
      throw new Error(`WorldCharacter ${worldCharacterId} was not found.`)
    }

    await this.db.worldEntity.create({
      data: {
        id: entityId,
        worldId: worldCharacter.worldId,
        worldCharacterId: worldCharacter.id,
        worldCharacterWorldId: worldCharacter.worldId,
        type: 'character',
        name: resolvedWorldCharacterName(worldCharacter),
        image: worldCharacter.character.image,
        data: {},
        createdById: worldCharacter.character.ownerUserId,
        visibilityScope: 'WORLD',
      },
    })
  }

  async detachWorldCharacterEntityToNpc(worldCharacterId: string) {
    const worldCharacter = await this.db.worldCharacter.findUnique({
      where: { id: worldCharacterId },
      include: {
        character: true,
        worldEntity: { select: { id: true } },
      },
    })
    if (!worldCharacter?.worldEntity) return

    await this.db.worldEntity.update({
      where: { id: worldCharacter.worldEntity.id },
      data: {
        worldCharacterId: null,
        worldCharacterWorldId: null,
        type: 'person',
        name: resolvedWorldCharacterName(worldCharacter),
        image: worldCharacter.character.image,
        visibilityScope: 'WORLD',
        visibilityCampaignId: null,
        visibilityUserId: null,
      },
    })
  }

  async deleteWorldCharacterForOwner(id: string, ownerUserId: string) {
    const result = await this.db.worldCharacter.deleteMany({
      where: { id, character: { ownerUserId } },
    })
    return result.count === 1
  }

  async moveWorldCharacterForOwner(
    id: string,
    ownerUserId: string,
    targetWorldId: string,
    input: UpdateWorldCharacterRecordInput,
  ) {
    try {
      const result = await this.db.worldCharacter.updateMany({
        where: { id, character: { ownerUserId } },
        data: {
          worldId: targetWorldId,
          ...input,
          worldData: input.worldData as Prisma.InputJsonValue | undefined,
        },
      })
      return result.count
        ? toWorldCharacter(
            await this.db.worldCharacter.findUniqueOrThrow({ where: { id } }),
          )
        : null
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new CharacterRepositoryConflictError()
      }
      throw error
    }
  }
}
