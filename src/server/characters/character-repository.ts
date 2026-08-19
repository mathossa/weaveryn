import type { WorldAuthorizationRepository } from '../worlds/world-permissions'

export interface CharacterRecord {
  id: string
  ownerUserId: string
  name: string
  image: string | null
  coreData: unknown
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface WorldCharacterRecord {
  id: string
  characterId: string
  worldId: string
  nameOverride: string | null
  worldData: unknown
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateCharacterRecordInput {
  id: string
  ownerUserId: string
  name: string
  image?: string | null
  coreData?: unknown
  status?: string
}

export interface UpdateCharacterRecordInput {
  name?: string
  image?: string | null
  coreData?: unknown
  status?: string
}

export interface CreateWorldCharacterRecordInput {
  id: string
  characterId: string
  worldId: string
  nameOverride?: string | null
  worldData?: unknown
  status?: string
}

export interface UpdateWorldCharacterRecordInput {
  nameOverride?: string | null
  worldData?: unknown
  status?: string
}

export class CharacterRepositoryConflictError extends Error {}

export interface CharacterRepository extends WorldAuthorizationRepository {
  runInTransaction<T>(
    operation: (repository: CharacterRepository) => Promise<T>,
  ): Promise<T>
  createCharacter(input: CreateCharacterRecordInput): Promise<CharacterRecord>
  findCharacterForOwner(
    characterId: string,
    ownerUserId: string,
  ): Promise<CharacterRecord | null>
  listCharactersForOwner(ownerUserId: string): Promise<CharacterRecord[]>
  updateCharacterForOwner(
    characterId: string,
    ownerUserId: string,
    input: UpdateCharacterRecordInput,
  ): Promise<CharacterRecord | null>
  createWorldCharacter(
    input: CreateWorldCharacterRecordInput,
  ): Promise<WorldCharacterRecord>
  findWorldCharacterForOwner(
    worldCharacterId: string,
    ownerUserId: string,
  ): Promise<WorldCharacterRecord | null>
  listWorldCharactersForOwner(
    characterId: string,
    ownerUserId: string,
  ): Promise<WorldCharacterRecord[]>
  updateWorldCharacterForOwner(
    worldCharacterId: string,
    ownerUserId: string,
    input: UpdateWorldCharacterRecordInput,
  ): Promise<WorldCharacterRecord | null>
  hasCampaignMembershipInWorld(
    worldId: string,
    userId: string,
  ): Promise<boolean>
  hasCampaignCharacterParticipation(worldCharacterId: string): Promise<boolean>
  createWorldCharacterEntity(
    worldCharacterId: string,
    entityId: string,
  ): Promise<void>
  preserveOrRemoveWorldCharacterEntity(worldCharacterId: string): Promise<void>
  deleteWorldCharacterForOwner(
    worldCharacterId: string,
    ownerUserId: string,
  ): Promise<boolean>
  moveWorldCharacterForOwner(
    worldCharacterId: string,
    ownerUserId: string,
    targetWorldId: string,
    input: UpdateWorldCharacterRecordInput,
  ): Promise<WorldCharacterRecord | null>
}
