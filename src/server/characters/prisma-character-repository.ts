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
      .then((v) => (v ? toCharacter(v) : null))
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
      )
        throw new CharacterRepositoryConflictError()
      throw error
    }
  }
  findWorldCharacterForOwner(id: string, ownerUserId: string) {
    return this.db.worldCharacter
      .findFirst({ where: { id, character: { ownerUserId } } })
      .then((v) => (v ? toWorldCharacter(v) : null))
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
}
