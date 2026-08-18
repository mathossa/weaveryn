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
const worldThreeId = '17000000-0000-4000-8000-000000000012'
const characterId = '17000000-0000-4000-8000-000000000020'
const worldCharacterOneId = '17000000-0000-4000-8000-000000000021'
const worldCharacterTwoId = '17000000-0000-4000-8000-000000000022'
const now = new Date('2026-08-15T00:00:00.000Z')

interface CharacterEntityRecord {
  id: string
  worldId: string
  worldCharacterId: string | null
  type: 'character' | 'person'
  name: string
  image: string | null
}

class Repository implements CharacterRepository {
  worlds = new Map([
    [worldOneId, { id: worldOneId, ownerId }],
    [worldTwoId, { id: worldTwoId, ownerId }],
    [worldThreeId, { id: worldThreeId, ownerId: outsiderId }],
  ])
  memberships = new Map<string, WorldRole>([
    [`${worldOneId}:${memberId}`, 'MEMBER'],
  ])
  campaignWorldMemberships = new Set<string>()
  characters: CharacterRecord[] = []
  incarnations: WorldCharacterRecord[] = []
  participations = new Set<string>()
  entities = new Map<string, CharacterEntityRecord>()
  relationships = new Map<
    string,
    { sourceEntityId: string; targetEntityId: string }
  >()

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
    ) {
      throw new CharacterRepositoryConflictError()
    }
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

  async listWorldCharactersForOwner(characterIdValue: string, userId: string) {
    return (await this.findCharacterForOwner(characterIdValue, userId))
      ? this.incarnations.filter((wc) => wc.characterId === characterIdValue)
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

  async hasCampaignMembershipInWorld(worldId: string, userId: string) {
    return this.campaignWorldMemberships.has(`${worldId}:${userId}`)
  }

  async hasCampaignCharacterParticipation(worldCharacterId: string) {
    return this.participations.has(worldCharacterId)
  }

  async createWorldCharacterEntity(
    worldCharacterId: string,
    entityId: string,
  ) {
    const worldCharacter = this.incarnations.find(
      (candidate) => candidate.id === worldCharacterId,
    )
    if (!worldCharacter) throw new Error('WorldCharacter not found')
    const character = this.characters.find(
      (candidate) => candidate.id === worldCharacter.characterId,
    )
    if (!character) throw new Error('Character not found')
    this.entities.set(entityId, {
      id: entityId,
      worldId: worldCharacter.worldId,
      worldCharacterId: worldCharacter.id,
      type: 'character',
      name: worldCharacter.nameOverride?.trim() || character.name,
      image: character.image,
    })
  }

  async detachWorldCharacterEntityToNpc(worldCharacterId: string) {
    const worldCharacter = this.incarnations.find(
      (candidate) => candidate.id === worldCharacterId,
    )
    if (!worldCharacter) return
    const character = this.characters.find(
      (candidate) => candidate.id === worldCharacter.characterId,
    )
    const entity = [...this.entities.values()].find(
      (candidate) => candidate.worldCharacterId === worldCharacterId,
    )
    if (!character || !entity) return
    Object.assign(entity, {
      worldCharacterId: null,
      type: 'person' as const,
      name: worldCharacter.nameOverride?.trim() || character.name,
      image: character.image,
    })
  }

  async deleteWorldCharacterForOwner(id: string, userId: string) {
    const worldCharacter = await this.findWorldCharacterForOwner(id, userId)
    if (!worldCharacter) return false
    const index = this.incarnations.indexOf(worldCharacter)
    this.incarnations.splice(index, 1)
    return true
  }

  async moveWorldCharacterForOwner(
    id: string,
    userId: string,
    targetWorldId: string,
    input: UpdateWorldCharacterRecordInput,
  ) {
    const worldCharacter = await this.findWorldCharacterForOwner(id, userId)
    if (!worldCharacter) return null
    if (
      this.incarnations.some(
        (candidate) =>
          candidate.id !== id &&
          candidate.characterId === worldCharacter.characterId &&
          candidate.worldId === targetWorldId,
      )
    ) {
      throw new CharacterRepositoryConflictError()
    }
    return Object.assign(worldCharacter, input, {
      worldId: targetWorldId,
      updatedAt: now,
    })
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

  it('creates separate World-specific incarnations and graph entities in multiple Worlds without changing Character data', async () => {
    const { repository, service } = harness()
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
    expect(repository.entities.get(first.id)).toMatchObject({
      worldId: worldOneId,
      worldCharacterId: first.id,
      type: 'character',
      name: 'Bodwick of Aldorath',
    })
    expect(repository.entities.get(second.id)).toMatchObject({
      worldId: worldTwoId,
      worldCharacterId: second.id,
      type: 'character',
      name: 'Bodwick',
    })
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

  it('lets a Campaign member create and update only their own WorldCharacter without World edit permission', async () => {
    const { repository, service } = harness()
    const character = await service.createCharacter({
      ownerUserId: ownerId,
      name: 'Bodwick',
    })
    repository.campaignWorldMemberships.add(`${worldThreeId}:${ownerId}`)

    const incarnation = await service.createWorldCharacter({
      actorUserId: ownerId,
      characterId: character.id,
      worldId: worldThreeId,
    })

    await expect(
      service.updateWorldCharacter(incarnation.id, ownerId, {
        nameOverride: 'Bodwick of the invited campaign',
      }),
    ).resolves.toMatchObject({
      nameOverride: 'Bodwick of the invited campaign',
    })

    await expect(
      service.createWorldCharacter({
        actorUserId: outsiderId,
        characterId: character.id,
        worldId: worldThreeId,
      }),
    ).rejects.toMatchObject({ code: 'CHARACTER_NOT_FOUND' })
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

  it('copies an incarnation without duplicating portable identity, World data, Campaign participation, or World relationships', async () => {
    const { repository, service } = harness()
    const character = await service.createCharacter({
      ownerUserId: ownerId,
      name: 'Bodwick',
    })
    const source = await service.createWorldCharacter({
      actorUserId: ownerId,
      characterId: character.id,
      worldId: worldOneId,
      nameOverride: 'Bodwick of Aldorath',
      worldData: { culture: 'Aldoran' },
    })
    repository.participations.add(source.id)
    repository.relationships.set('source-relation', {
      sourceEntityId: source.id,
      targetEntityId: 'source-world-target',
    })

    const copy = await service.copyWorldCharacter({
      actorUserId: ownerId,
      sourceWorldCharacterId: source.id,
      targetWorldId: worldTwoId,
      nameOverride: 'Bodwick of Veyra',
      worldData: { culture: 'Veyran' },
    })

    expect(copy).toMatchObject({
      characterId: character.id,
      worldId: worldTwoId,
      nameOverride: 'Bodwick of Veyra',
      worldData: { culture: 'Veyran' },
    })
    expect(copy.id).not.toBe(source.id)
    expect(source).toMatchObject({
      worldId: worldOneId,
      nameOverride: 'Bodwick of Aldorath',
      worldData: { culture: 'Aldoran' },
    })
    expect(repository.characters).toHaveLength(1)
    expect(repository.characters[0]?.ownerUserId).toBe(ownerId)
    expect(repository.participations.has(copy.id)).toBe(false)
    expect(repository.entities.get(copy.id)).toMatchObject({
      worldCharacterId: copy.id,
      worldId: worldTwoId,
      type: 'character',
    })
    expect(
      [...repository.relationships.values()].some(
        (relationship) => relationship.sourceEntityId === copy.id,
      ),
    ).toBe(false)
  })

  it('rejects duplicate and unauthorized copy targets', async () => {
    const { service } = harness()
    const character = await service.createCharacter({
      ownerUserId: ownerId,
      name: 'Bodwick',
    })
    const source = await service.createWorldCharacter({
      actorUserId: ownerId,
      characterId: character.id,
      worldId: worldOneId,
    })
    await service.copyWorldCharacter({
      actorUserId: ownerId,
      sourceWorldCharacterId: source.id,
      targetWorldId: worldTwoId,
    })
    await expect(
      service.copyWorldCharacter({
        actorUserId: ownerId,
        sourceWorldCharacterId: source.id,
        targetWorldId: worldTwoId,
      }),
    ).rejects.toMatchObject({ code: 'WORLD_CHARACTER_ALREADY_EXISTS' })
    await expect(
      service.copyWorldCharacter({
        actorUserId: ownerId,
        sourceWorldCharacterId: source.id,
        targetWorldId: worldThreeId,
      }),
    ).rejects.toMatchObject({ code: 'WORLD_PERMISSION_DENIED' })
  })

  it('migrates only after Campaign participation is resolved, preserves the source graph as an NPC, and creates a fresh target Character entity', async () => {
    const { repository, service } = harness()
    const character = await service.createCharacter({
      ownerUserId: ownerId,
      name: 'Bodwick',
      image: '/bodwick.webp',
    })
    const source = await service.createWorldCharacter({
      actorUserId: ownerId,
      characterId: character.id,
      worldId: worldOneId,
      nameOverride: 'Bodwick of Aldorath',
      worldData: { culture: 'Aldoran' },
    })
    repository.relationships.set('source-relation', {
      sourceEntityId: source.id,
      targetEntityId: 'moonblade',
    })
    repository.participations.add(source.id)

    await expect(
      service.migrateWorldCharacter({
        actorUserId: ownerId,
        worldCharacterId: source.id,
        targetWorldId: worldTwoId,
      }),
    ).rejects.toMatchObject({
      code: 'WORLD_CHARACTER_HAS_CAMPAIGN_PARTICIPATION',
    })
    expect(source.worldId).toBe(worldOneId)
    expect(repository.entities.get(source.id)).toMatchObject({
      worldCharacterId: source.id,
      type: 'character',
    })

    repository.participations.delete(source.id)
    const migrated = await service.migrateWorldCharacter({
      actorUserId: ownerId,
      worldCharacterId: source.id,
      targetWorldId: worldTwoId,
      worldData: { culture: 'Veyran' },
    })

    expect(migrated).toMatchObject({
      id: source.id,
      characterId: character.id,
      worldId: worldTwoId,
      worldData: { culture: 'Veyran' },
    })
    expect(repository.characters[0]?.ownerUserId).toBe(ownerId)
    expect(repository.entities.get(source.id)).toMatchObject({
      worldId: worldOneId,
      worldCharacterId: null,
      type: 'person',
      name: 'Bodwick of Aldorath',
      image: '/bodwick.webp',
    })
    expect(repository.relationships.get('source-relation')).toEqual({
      sourceEntityId: source.id,
      targetEntityId: 'moonblade',
    })
    expect(repository.entities.get(worldCharacterTwoId)).toMatchObject({
      worldId: worldTwoId,
      worldCharacterId: source.id,
      type: 'character',
    })
  })

  it('detaches a WorldCharacter entity into an NPC before removing the WorldCharacter', async () => {
    const { repository, service } = harness()
    const character = await service.createCharacter({
      ownerUserId: ownerId,
      name: 'Bodwick',
    })
    const worldCharacter = await service.createWorldCharacter({
      actorUserId: ownerId,
      characterId: character.id,
      worldId: worldOneId,
      nameOverride: 'Bodwick of Aldorath',
    })
    repository.relationships.set('source-relation', {
      sourceEntityId: worldCharacter.id,
      targetEntityId: 'silver-hand',
    })

    await service.deleteWorldCharacter(worldCharacter.id, ownerId)

    expect(repository.incarnations).toHaveLength(0)
    expect(repository.entities.get(worldCharacter.id)).toMatchObject({
      worldId: worldOneId,
      worldCharacterId: null,
      type: 'person',
      name: 'Bodwick of Aldorath',
    })
    expect(repository.relationships.has('source-relation')).toBe(true)
  })

  it('enforces both source and target World authorization for migration', async () => {
    const { repository, service } = harness()
    const character = await service.createCharacter({
      ownerUserId: ownerId,
      name: 'Bodwick',
    })
    const source = await service.createWorldCharacter({
      actorUserId: ownerId,
      characterId: character.id,
      worldId: worldOneId,
    })
    await expect(
      service.migrateWorldCharacter({
        actorUserId: ownerId,
        worldCharacterId: source.id,
        targetWorldId: worldThreeId,
      }),
    ).rejects.toMatchObject({ code: 'WORLD_PERMISSION_DENIED' })
    repository.worlds.set(worldOneId, { id: worldOneId, ownerId: outsiderId })
    await expect(
      service.migrateWorldCharacter({
        actorUserId: ownerId,
        worldCharacterId: source.id,
        targetWorldId: worldTwoId,
      }),
    ).rejects.toMatchObject({ code: 'WORLD_PERMISSION_DENIED' })
    expect(source.worldId).toBe(worldOneId)
  })
})
