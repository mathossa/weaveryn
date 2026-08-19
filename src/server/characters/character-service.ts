import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { WorldDomainError } from '../worlds/world-errors'
import {
  WORLD_PERMISSIONS,
  WorldAuthorizationService,
} from '../worlds/world-permissions'
import {
  characterNotFound,
  worldCharacterAlreadyExists,
  worldCharacterHasCampaignParticipation,
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

export interface CopyWorldCharacterInput {
  actorUserId: string
  sourceWorldCharacterId: string
  targetWorldId: string
  nameOverride?: string | null
  worldData?: unknown
  status?: string
}

export interface MigrateWorldCharacterInput {
  actorUserId: string
  worldCharacterId: string
  targetWorldId: string
  nameOverride?: string | null
  worldData?: unknown
  status?: string
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

async function assertOwnWorldCharacterAccess(
  repository: CharacterRepository,
  userId: string,
  worldId: string,
) {
  const authorization = new WorldAuthorizationService(repository)

  try {
    await authorization.assertPermission(
      userId,
      worldId,
      WORLD_PERMISSIONS.EDIT_CONTENT,
    )
    return
  } catch (error) {
    if (
      !(error instanceof WorldDomainError) ||
      error.code !== 'WORLD_PERMISSION_DENIED'
    ) {
      throw error
    }
  }

  if (await repository.hasCampaignMembershipInWorld(worldId, userId)) return

  throw new WorldDomainError(
    'WORLD_PERMISSION_DENIED',
    `User ${userId} does not have permission to manage their Character in World ${worldId}.`,
  )
}

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

      await assertOwnWorldCharacterAccess(
        repository,
        input.actorUserId,
        input.worldId,
      )

      try {
        const worldCharacter = await repository.createWorldCharacter({
          id: this.createId(),
          characterId: input.characterId,
          worldId: input.worldId,
          nameOverride: input.nameOverride,
          worldData: input.worldData,
        })
        await repository.createWorldCharacterEntity(
          worldCharacter.id,
          worldCharacter.id,
        )
        return worldCharacter
      } catch (error) {
        if (error instanceof CharacterRepositoryConflictError) {
          throw worldCharacterAlreadyExists(input.characterId, input.worldId)
        }
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

      await assertOwnWorldCharacterAccess(
        repository,
        actorUserId,
        current.worldId,
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

  async deleteWorldCharacter(
    worldCharacterId: string,
    actorUserId: string,
  ): Promise<void> {
    return this.repository.runInTransaction(async (repository) => {
      const current = await repository.findWorldCharacterForOwner(
        worldCharacterId,
        actorUserId,
      )
      if (!current) throw worldCharacterNotFound(worldCharacterId)

      await assertOwnWorldCharacterAccess(
        repository,
        actorUserId,
        current.worldId,
      )
      if (await repository.hasCampaignCharacterParticipation(current.id)) {
        throw worldCharacterHasCampaignParticipation(current.id)
      }

      await repository.detachWorldCharacterEntityToNpc(current.id)
      if (
        !(await repository.deleteWorldCharacterForOwner(
          current.id,
          actorUserId,
        ))
      ) {
        throw worldCharacterNotFound(current.id)
      }
    })
  }

  async copyWorldCharacter(
    input: CopyWorldCharacterInput,
  ): Promise<WorldCharacterRecord> {
    return this.repository.runInTransaction(async (repository) => {
      const source = await repository.findWorldCharacterForOwner(
        input.sourceWorldCharacterId,
        input.actorUserId,
      )
      if (!source) throw worldCharacterNotFound(input.sourceWorldCharacterId)

      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        input.actorUserId,
        input.targetWorldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )

      try {
        const copy = await repository.createWorldCharacter({
          id: this.createId(),
          characterId: source.characterId,
          worldId: input.targetWorldId,
          // Deliberately do not inherit source World data or references.
          nameOverride: input.nameOverride,
          worldData: input.worldData,
          status: input.status,
        })
        await repository.createWorldCharacterEntity(copy.id, copy.id)
        return copy
      } catch (error) {
        if (error instanceof CharacterRepositoryConflictError) {
          throw worldCharacterAlreadyExists(
            source.characterId,
            input.targetWorldId,
          )
        }
        throw error
      }
    })
  }

  async migrateWorldCharacter(
    input: MigrateWorldCharacterInput,
  ): Promise<WorldCharacterRecord> {
    return this.repository.runInTransaction(async (repository) => {
      const source = await repository.findWorldCharacterForOwner(
        input.worldCharacterId,
        input.actorUserId,
      )
      if (!source) throw worldCharacterNotFound(input.worldCharacterId)

      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        input.actorUserId,
        source.worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )
      await authorization.assertPermission(
        input.actorUserId,
        input.targetWorldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )

      if (await repository.hasCampaignCharacterParticipation(source.id)) {
        throw worldCharacterHasCampaignParticipation(source.id)
      }

      try {
        // The repository preserves source-World continuity when the graph node
        // has meaningful World content/references, otherwise it removes the
        // unused Character entity before the WorldCharacter moves.
        await repository.detachWorldCharacterEntityToNpc(source.id)

        const migrated = await repository.moveWorldCharacterForOwner(
          source.id,
          input.actorUserId,
          input.targetWorldId,
          {
            ...(input.nameOverride !== undefined
              ? { nameOverride: input.nameOverride }
              : {}),
            ...(input.worldData !== undefined
              ? { worldData: input.worldData }
              : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
          },
        )
        if (!migrated) throw worldCharacterNotFound(source.id)

        // The target World gets or reclaims one graph identity. Source-World
        // relationships are intentionally not copied to a different entity.
        await repository.createWorldCharacterEntity(
          migrated.id,
          this.createId(),
        )
        return migrated
      } catch (error) {
        if (error instanceof CharacterRepositoryConflictError) {
          throw worldCharacterAlreadyExists(
            source.characterId,
            input.targetWorldId,
          )
        }
        throw error
      }
    })
  }
}

export const characterService = new CharacterService(
  new PrismaCharacterRepository(prisma),
)
