import { describe, expect, it } from 'vitest'
import type { WorldRole } from '../worlds/world-role'
import { CharacterService } from './character-service'
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

const ownerId = '17000000-0000-4000-8000-000000000001'
const outsiderId = '17000000-0000-4000-8000-000000000002'
const memberId = '17000000-0000-4000-8000-000000000003'
const worldOneId = '17000000-0000-4000-8000-000000000010'
const worldTwoId = '17000000-0000-4000-8000-000000000011'
const characterId = '17000000-0000-4000-8000-000000000020'
const worldCharacterOneId = '17000000-0000-4000-8000-000000000021'
const worldCharacterTwoId = '17000000-0000-4000-8000-000000000022'
const now = new Date('2026-08-15T00:00:00.000Z')

class Repository implements CharacterRepository {
  worlds = new Map([
    [worldOneId, { id: worldOneId, ownerId }],
    [worldTwoId, { id: worldTwoId, ownerId }],
  ])
  memberships = new Map<string, WorldRole>([
    [`${worldOneId}:${memberId}`, 'MEMBER'],
  ])
  characters: CharacterRecord[] = []
  incarnations: WorldCharacterRecord[] = []
  runInTransaction<T>(
    operation: (repository: CharacterRepository) => Promise<T>,
  ): Promise<T> {
    return operation(this)
  }
  async findWorldById(id: string) {
    return this.worlds.get(id) ?? null
  }
  async findMembership(worldId: string, userId: string) {
    const role = this.memberships.get(`${worldId}:${userId}`)
    return role
      ? {
          id: `${worldId}:${userId}`,
          worldId,
          userId,
          role,
          joinedAt: now,
          updatedAt: now,
        }
      : null
  }
  async createCharacter(input: CreateCharacterRecordInput) {
    const result: CharacterRecord = {
      id: input.id,
      ownerUserId: input.ownerUserId,
      name: input.name,
      image: input.image ?? null,
      coreData: input.coreData ?? null,
      status: input.status ?? 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    }
    this.characters.push(result)
    return result
  }
  async findCharacterForOwner(id: string, userId: string) {
    return (
      this.characters.find((c) => c.id === id && c.ownerUserId === userId) ??
      null
    )
  }
  async listCharactersForOwner(userId: string) {
    return this.characters.filter((c) => c.ownerUserId === userId)
  }
  async updateCharacterForOwner(
    id: string,
    userId: string,
    input: UpdateCharacterRecordInput,
  ) {
    const character = await this.findCharacterForOwner(id, userId)
    return character
      ? Object.assign(character, input, { updatedAt: now })
      : null
  }
  async createWorldCharacter(input: CreateWorldCharacterRecordInput) {
    if (
      this.incarnations.some(
        (wc) =>
          wc.characterId === input.characterId && wc.worldId === input.worldId,
      )
    )
      throw new CharacterRepositoryConflictError()
    const result: WorldCharacterRecord = {
      id: input.id,
      characterId: input.characterId,
      worldId: input.worldId,
      nameOverride: input.nameOverride ?? null,
      worldData: input.worldData ?? null,
      status: input.status ?? 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    }
    this.incarnations.push(result)
    return result
  }
  async findWorldCharacterForOwner(id: string, userId: string) {
    const wc = this.incarnations.find((candidate) => candidate.id === id)
    return wc && (await this.findCharacterForOwner(wc.characterId, userId))
      ? wc
      : null
  }
  async listWorldCharactersForOwner(characterId: string, userId: string) {
    return (await this.findCharacterForOwner(characterId, userId))
      ? this.incarnations.filter((wc) => wc.characterId === characterId)
      : []
  }
  async updateWorldCharacterForOwner(
    id: string,
    userId: string,
    input: UpdateWorldCharacterRecordInput,
  ) {
    const wc = await this.findWorldCharacterForOwner(id, userId)
    return wc ? Object.assign(wc, input, { updatedAt: now }) : null
  }
}

function harness() {
  const repository = new Repository()
  const ids = [characterId, worldCharacterOneId, worldCharacterTwoId].values()
  return {
    repository,
    service: new CharacterService(repository, () => ids.next().value!),
  }
}

describe('CharacterService', () => {
  it('creates, loads, lists, and updates only portable user-owned data', async () => {
    const { service } = harness()
    const character = await service.createCharacter({
      ownerUserId: ownerId,
      name: 'Bodwick',
      coreData: { concept: 'wandering bard' },
    })
    expect(await service.loadCharacter(character.id, ownerId)).toBe(character)
    expect(await service.loadCharacter(character.id, outsiderId)).toBeNull()
    expect(await service.listCharacters(ownerId)).toEqual([character])
    await expect(
      service.updateCharacter(character.id, outsiderId, { name: 'Taken' }),
    ).rejects.toMatchObject({ code: 'CHARACTER_NOT_FOUND' })
    await expect(
      service.updateCharacter(character.id, ownerId, {
        name: 'Bodwick the Portable',
        coreData: { concept: 'bard' },
      }),
    ).resolves.toMatchObject({
      name: 'Bodwick the Portable',
      coreData: { concept: 'bard' },
    })
  })

  it('creates separate World-specific incarnations in multiple Worlds without changing Character data', async () => {
    const { service } = harness()
    const character = await service.createCharacter({
      ownerUserId: ownerId,
      name: 'Bodwick',
      coreData: { concept: 'portable' },
    })
    const first = await service.createWorldCharacter({
      actorUserId: ownerId,
      characterId: character.id,
      worldId: worldOneId,
      nameOverride: 'Bodwick of Aldorath',
      worldData: { culture: 'Aldoran' },
    })
    const second = await service.createWorldCharacter({
      actorUserId: ownerId,
      characterId: character.id,
      worldId: worldTwoId,
      worldData: { culture: 'Veyran' },
    })
    expect(await service.listWorldCharacters(character.id, ownerId)).toEqual([
      first,
      second,
    ])
    expect(await service.loadCharacter(character.id, ownerId)).toMatchObject({
      name: 'Bodwick',
      coreData: { concept: 'portable' },
    })
    expect(second.nameOverride).toBeNull()
  })

  it('requires the Character owner and World edit permission for incarnations and updates', async () => {
    const { service } = harness()
    const character = await service.createCharacter({
      ownerUserId: ownerId,
      name: 'Bodwick',
    })
    await expect(
      service.createWorldCharacter({
        actorUserId: outsiderId,
        characterId: character.id,
        worldId: worldOneId,
      }),
    ).rejects.toMatchObject({ code: 'CHARACTER_NOT_FOUND' })
    await expect(
      service.createWorldCharacter({
        actorUserId: ownerId,
        characterId: character.id,
        worldId: '17000000-0000-4000-8000-000000000099',
      }),
    ).rejects.toMatchObject({ code: 'WORLD_NOT_FOUND' })
    const incarnation = await service.createWorldCharacter({
      actorUserId: ownerId,
      characterId: character.id,
      worldId: worldOneId,
      worldData: { history: 'before' },
    })
    await expect(
      service.updateWorldCharacter(incarnation.id, outsiderId, {
        worldData: { history: 'takeover' },
      }),
    ).rejects.toMatchObject({ code: 'WORLD_CHARACTER_NOT_FOUND' })
    await expect(
      service.updateWorldCharacter(incarnation.id, ownerId, {
        nameOverride: 'Bodwick of Aldorath',
        worldData: { history: 'after' },
      }),
    ).resolves.toMatchObject({
      nameOverride: 'Bodwick of Aldorath',
      worldData: { history: 'after' },
    })
  })

  it('rejects a second incarnation of the same Character in one World', async () => {
    const { service } = harness()
    const character = await service.createCharacter({
      ownerUserId: ownerId,
      name: 'Bodwick',
    })
    await service.createWorldCharacter({
      actorUserId: ownerId,
      characterId: character.id,
      worldId: worldOneId,
    })
    await expect(
      service.createWorldCharacter({
        actorUserId: ownerId,
        characterId: character.id,
        worldId: worldOneId,
      }),
    ).rejects.toMatchObject({ code: 'WORLD_CHARACTER_ALREADY_EXISTS' })
  })
})
