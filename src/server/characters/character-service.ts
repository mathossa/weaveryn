import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import {
  WORLD_PERMISSIONS,
  WorldAuthorizationService,
} from '../worlds/world-permissions'
import {
  characterNotFound,
  worldCharacterAlreadyExists,
  worldCharacterNotFound,
} from './character-errors'
import {
  CharacterRepositoryConflictError,
  type CharacterRecord,
  type CharacterRepository,
  type UpdateCharacterRecordInput,
  type UpdateWorldCharacterRecordInput,
  type WorldCharacterRecord,
} from './character-repository'
import { PrismaCharacterRepository } from './prisma-character-repository'

export interface CreateCharacterInput {
  ownerUserId: string
  name: string
  image?: string | null
  coreData?: unknown
}
export interface CreateWorldCharacterInput {
  actorUserId: string
  characterId: string
  worldId: string
  nameOverride?: string | null
  worldData?: unknown
}
export type CharacterIdFactory = () => string
const pickCharacterUpdates = (input: UpdateCharacterRecordInput) => ({
  ...(input.name !== undefined ? { name: input.name } : {}),
  ...(input.image !== undefined ? { image: input.image } : {}),
  ...(input.coreData !== undefined ? { coreData: input.coreData } : {}),
})
const pickWorldCharacterUpdates = (input: UpdateWorldCharacterRecordInput) => ({
  ...(input.nameOverride !== undefined
    ? { nameOverride: input.nameOverride }
    : {}),
  ...(input.worldData !== undefined ? { worldData: input.worldData } : {}),
})

export class CharacterService {
  constructor(
    private readonly repository: CharacterRepository,
    private readonly createId: CharacterIdFactory = randomUUID,
  ) {}
  createCharacter(input: CreateCharacterInput): Promise<CharacterRecord> {
    return this.repository.createCharacter({ id: this.createId(), ...input })
  }
  loadCharacter(characterId: string, ownerUserId: string) {
    return this.repository.findCharacterForOwner(characterId, ownerUserId)
  }
  listCharacters(ownerUserId: string) {
    return this.repository.listCharactersForOwner(ownerUserId)
  }
  async updateCharacter(
    characterId: string,
    ownerUserId: string,
    input: UpdateCharacterRecordInput,
  ) {
    const character = await this.repository.updateCharacterForOwner(
      characterId,
      ownerUserId,
      pickCharacterUpdates(input),
    )
    if (!character) throw characterNotFound(characterId)
    return character
  }
  async createWorldCharacter(
    input: CreateWorldCharacterInput,
  ): Promise<WorldCharacterRecord> {
    return this.repository.runInTransaction(async (repository) => {
      const character = await repository.findCharacterForOwner(
        input.characterId,
        input.actorUserId,
      )
      if (!character) throw characterNotFound(input.characterId)
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        input.actorUserId,
        input.worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )
      try {
        return await repository.createWorldCharacter({
          id: this.createId(),
          characterId: input.characterId,
          worldId: input.worldId,
          nameOverride: input.nameOverride,
          worldData: input.worldData,
        })
      } catch (error) {
        if (error instanceof CharacterRepositoryConflictError)
          throw worldCharacterAlreadyExists(input.characterId, input.worldId)
        throw error
      }
    })
  }
  async loadWorldCharacter(worldCharacterId: string, ownerUserId: string) {
    return this.repository.findWorldCharacterForOwner(
      worldCharacterId,
      ownerUserId,
    )
  }
  listWorldCharacters(characterId: string, ownerUserId: string) {
    return this.repository.listWorldCharactersForOwner(characterId, ownerUserId)
  }
  async updateWorldCharacter(
    worldCharacterId: string,
    actorUserId: string,
    input: UpdateWorldCharacterRecordInput,
  ) {
    return this.repository.runInTransaction(async (repository) => {
      const current = await repository.findWorldCharacterForOwner(
        worldCharacterId,
        actorUserId,
      )
      if (!current) throw worldCharacterNotFound(worldCharacterId)
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        actorUserId,
        current.worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )
      const updated = await repository.updateWorldCharacterForOwner(
        worldCharacterId,
        actorUserId,
        pickWorldCharacterUpdates(input),
      )
      if (!updated) throw worldCharacterNotFound(worldCharacterId)
      return updated
    })
  }
}
export const characterService = new CharacterService(
  new PrismaCharacterRepository(prisma),
)
