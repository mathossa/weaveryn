import { describe, expect, it } from 'vitest'
import type { CampaignRole } from '../campaigns/campaign-role'
import { CampaignCharacterService } from './campaign-character-service'
import {
  CampaignCharacterRepositoryConflictError,
  type CampaignCharacterRecord,
  type CampaignCharacterRepository,
  type CreateCampaignCharacterRecordInput,
  type UpdateCampaignCharacterRecordInput,
} from './campaign-character-repository'

const gmId = '18000000-0000-4000-8000-000000000001'
const assistantGmId = '18000000-0000-4000-8000-000000000002'
const characterOwnerId = '18000000-0000-4000-8000-000000000003'
const outsiderId = '18000000-0000-4000-8000-000000000004'
const worldOneId = '18000000-0000-4000-8000-000000000010'
const worldTwoId = '18000000-0000-4000-8000-000000000011'
const campaignOneId = '18000000-0000-4000-8000-000000000020'
const campaignTwoId = '18000000-0000-4000-8000-000000000021'
const otherWorldCampaignId = '18000000-0000-4000-8000-000000000022'
const worldCharacterId = '18000000-0000-4000-8000-000000000030'
const otherWorldCharacterId = '18000000-0000-4000-8000-000000000031'
const characterId = '18000000-0000-4000-8000-000000000032'
const now = new Date('2026-08-15T00:00:00.000Z')

class Repository implements CampaignCharacterRepository {
  characters = new Map([
    [characterId, { id: characterId, ownerUserId: characterOwnerId }],
  ])
  campaigns = new Map([
    [campaignOneId, { id: campaignOneId, worldId: worldOneId, ownerId: gmId }],
    [campaignTwoId, { id: campaignTwoId, worldId: worldOneId, ownerId: gmId }],
    [
      otherWorldCampaignId,
      { id: otherWorldCampaignId, worldId: worldTwoId, ownerId: gmId },
    ],
  ])
  worldCharacters = new Map([
    [
      worldCharacterId,
      {
        id: worldCharacterId,
        characterId,
        worldId: worldOneId,
        ownerUserId: characterOwnerId,
      },
    ],
    [
      otherWorldCharacterId,
      {
        id: otherWorldCharacterId,
        characterId,
        worldId: worldTwoId,
        ownerUserId: characterOwnerId,
      },
    ],
  ])
  memberships = new Map<string, CampaignRole>([
    [`${campaignOneId}:${assistantGmId}`, 'ASSISTANT_GM'],
    [`${campaignOneId}:${characterOwnerId}`, 'PLAYER'],
  ])
  records: CampaignCharacterRecord[] = []
  runInTransaction<T>(
    operation: (repository: CampaignCharacterRepository) => Promise<T>,
  ): Promise<T> {
    return operation(this)
  }
  async findWorldCharacterById(id: string) {
    return this.worldCharacters.get(id) ?? null
  }
  async findCampaignById(id: string) {
    return this.campaigns.get(id) ?? null
  }
  async findCampaignMembership(campaignId: string, userId: string) {
    const role = this.memberships.get(`${campaignId}:${userId}`)
    return role ? { role } : null
  }
  async createCampaignCharacter(input: CreateCampaignCharacterRecordInput) {
    if (
      this.records.some(
        (record) =>
          record.worldCharacterId === input.worldCharacterId &&
          record.campaignId === input.campaignId,
      )
    ) {
      throw new CampaignCharacterRepositoryConflictError()
    }
    const record: CampaignCharacterRecord = {
      id: input.id,
      worldCharacterId: input.worldCharacterId,
      campaignId: input.campaignId,
      sheetData: input.sheetData,
      status: input.status ?? 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    }
    this.records.push(record)
    return record
  }
  async findCampaignCharacter(id: string) {
    return this.records.find((record) => record.id === id) ?? null
  }
  async findCampaignCharacterWithOwner(id: string) {
    const record = await this.findCampaignCharacter(id)
    const worldCharacter =
      record && (await this.findWorldCharacterById(record.worldCharacterId))
    return record && worldCharacter
      ? { ...record, ownerUserId: worldCharacter.ownerUserId }
      : null
  }
  async listCampaignCharacters(campaignId: string) {
    return this.records.filter((record) => record.campaignId === campaignId)
  }
  async updateCampaignCharacter(
    id: string,
    input: UpdateCampaignCharacterRecordInput,
  ) {
    const record = await this.findCampaignCharacter(id)
    return record ? Object.assign(record, input, { updatedAt: now }) : null
  }
  async deleteCampaignCharacter(id: string) {
    const index = this.records.findIndex((record) => record.id === id)
    if (index < 0) return false
    this.records.splice(index, 1)
    return true
  }
}

function harness() {
  const repository = new Repository()
  let index = 40
  return {
    repository,
    service: new CampaignCharacterService(
      repository,
      () => `18000000-0000-4000-8000-${String(index++).padStart(12, '0')}`,
    ),
  }
}

describe('CampaignCharacterService', () => {
  it('allows one WorldCharacter to participate in two Campaigns in its World with independent state', async () => {
    const { service } = harness()
    const one = await service.createCampaignCharacter({
      actorUserId: gmId,
      worldCharacterId,
      campaignId: campaignOneId,
      sheetData: { gold: 12 },
      status: 'ACTIVE',
    })
    const two = await service.createCampaignCharacter({
      actorUserId: gmId,
      worldCharacterId,
      campaignId: campaignTwoId,
      sheetData: { gold: 3 },
      status: 'RESTING',
    })
    expect(one.campaignId).toBe(campaignOneId)
    expect(two.campaignId).toBe(campaignTwoId)
    expect(one.sheetData).toEqual({ gold: 12 })
    expect(two.sheetData).toEqual({ gold: 3 })
    expect(two.status).toBe('RESTING')
  })

  it('rejects duplicate participation with a typed error', async () => {
    const { service } = harness()
    await service.createCampaignCharacter({
      actorUserId: gmId,
      worldCharacterId,
      campaignId: campaignOneId,
    })
    await expect(
      service.createCampaignCharacter({
        actorUserId: gmId,
        worldCharacterId,
        campaignId: campaignOneId,
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CHARACTER_ALREADY_EXISTS' })
  })

  it('rejects cross-World participation before a record is written', async () => {
    const { service, repository } = harness()
    await expect(
      service.createCampaignCharacter({
        actorUserId: gmId,
        worldCharacterId,
        campaignId: otherWorldCampaignId,
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CHARACTER_CROSS_WORLD' })
    expect(repository.records).toEqual([])
  })

  it('loads CampaignCharacter state independently and updates only its selected participation', async () => {
    const { service } = harness()
    const one = await service.createCampaignCharacter({
      actorUserId: gmId,
      worldCharacterId,
      campaignId: campaignOneId,
      sheetData: { gold: 12 },
    })
    const two = await service.createCampaignCharacter({
      actorUserId: gmId,
      worldCharacterId,
      campaignId: campaignTwoId,
      sheetData: { gold: 3 },
    })
    await service.updateCampaignCharacter(one.id, characterOwnerId, {
      sheetData: { gold: 18 },
      status: 'INJURED',
    })
    await expect(
      service.loadCampaignCharacter(one.id, characterOwnerId),
    ).resolves.toMatchObject({ sheetData: { gold: 18 }, status: 'INJURED' })
    await expect(
      service.loadCampaignCharacter(two.id, gmId),
    ).resolves.toMatchObject({ sheetData: { gold: 3 }, status: 'ACTIVE' })
  })

  it('allows GMs and Assistant GMs to manage participation, but lets a Character owner only update their own state', async () => {
    const { service } = harness()
    const created = await service.createCampaignCharacter({
      actorUserId: assistantGmId,
      worldCharacterId,
      campaignId: campaignOneId,
    })
    await expect(
      service.updateCampaignCharacter(created.id, characterOwnerId, {
        status: 'READY',
      }),
    ).resolves.toMatchObject({ status: 'READY' })
    await expect(
      service.createCampaignCharacter({
        actorUserId: characterOwnerId,
        worldCharacterId,
        campaignId: campaignTwoId,
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CHARACTER_PERMISSION_DENIED' })
    await expect(
      service.removeCampaignCharacter(created.id, characterOwnerId),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CHARACTER_PERMISSION_DENIED' })
    await expect(
      service.updateCampaignCharacter(created.id, outsiderId, {
        status: 'STOLEN',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CHARACTER_PERMISSION_DENIED' })
  })

  it('requires Campaign access before Character ownership grants state access', async () => {
    const { service, repository } = harness()
    const created = await service.createCampaignCharacter({
      actorUserId: gmId,
      worldCharacterId,
      campaignId: campaignTwoId,
      sheetData: { gold: 3 },
    })

    await expect(
      service.loadCampaignCharacter(created.id, characterOwnerId),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CHARACTER_PERMISSION_DENIED' })
    await expect(
      service.updateCampaignCharacter(created.id, characterOwnerId, {
        status: 'STOLEN',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CHARACTER_PERMISSION_DENIED' })

    repository.memberships.set(
      `${campaignTwoId}:${characterOwnerId}`,
      'SPECTATOR',
    )
    await expect(
      service.loadCampaignCharacter(created.id, characterOwnerId),
    ).resolves.toMatchObject({ id: created.id })
    await expect(
      service.updateCampaignCharacter(created.id, characterOwnerId, {
        status: 'STOLEN',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CHARACTER_PERMISSION_DENIED' })

    repository.memberships.set(`${campaignTwoId}:${characterOwnerId}`, 'PLAYER')
    await expect(
      service.updateCampaignCharacter(created.id, characterOwnerId, {
        status: 'READY',
      }),
    ).resolves.toMatchObject({ status: 'READY' })
  })

  it('lists only for Campaign managers and removing participation preserves the WorldCharacter and Character identity', async () => {
    const { service, repository } = harness()
    const created = await service.createCampaignCharacter({
      actorUserId: gmId,
      worldCharacterId,
      campaignId: campaignOneId,
    })
    await expect(
      service.listCampaignCharacters(campaignOneId, outsiderId),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CHARACTER_PERMISSION_DENIED' })
    await expect(
      service.listCampaignCharacters(campaignOneId, gmId),
    ).resolves.toEqual([created])
    await service.removeCampaignCharacter(created.id, assistantGmId)
    expect(repository.records).toEqual([])
    expect(repository.worldCharacters.get(worldCharacterId)).toMatchObject({
      ownerUserId: characterOwnerId,
    })
    expect(repository.characters.get(characterId)).toMatchObject({
      ownerUserId: characterOwnerId,
    })
  })
})
