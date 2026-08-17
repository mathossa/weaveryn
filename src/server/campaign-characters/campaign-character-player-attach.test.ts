import { describe, expect, it } from 'vitest'
import type { CampaignRole } from '../campaigns/campaign-role'
import { CampaignCharacterService } from './campaign-character-service'
import type {
  CampaignCharacterRecord,
  CampaignCharacterRepository,
  CreateCampaignCharacterRecordInput,
  UpdateCampaignCharacterRecordInput,
} from './campaign-character-repository'

const campaignId = '18100000-0000-4000-8000-000000000001'
const worldId = '18100000-0000-4000-8000-000000000002'
const gmId = '18100000-0000-4000-8000-000000000003'
const playerId = '18100000-0000-4000-8000-000000000004'
const spectatorId = '18100000-0000-4000-8000-000000000005'
const otherOwnerId = '18100000-0000-4000-8000-000000000006'
const worldCharacterId = '18100000-0000-4000-8000-000000000007'
const otherWorldCharacterId = '18100000-0000-4000-8000-000000000008'
const createdId = '18100000-0000-4000-8000-000000000009'
const now = new Date('2026-08-17T00:00:00.000Z')

class Repository implements CampaignCharacterRepository {
  memberships = new Map<string, CampaignRole>([
    [playerId, 'PLAYER'],
    [spectatorId, 'SPECTATOR'],
  ])
  records: CampaignCharacterRecord[] = []

  runInTransaction<T>(
    operation: (repository: CampaignCharacterRepository) => Promise<T>,
  ): Promise<T> {
    return operation(this)
  }
  async findWorldCharacterById(id: string) {
    if (id === worldCharacterId) return { id, worldId, ownerUserId: playerId }
    if (id === otherWorldCharacterId)
      return { id, worldId, ownerUserId: otherOwnerId }
    return null
  }
  async findCampaignById(id: string) {
    return id === campaignId ? { id, worldId, ownerId: gmId } : null
  }
  async findCampaignMembership(id: string, userId: string) {
    if (id !== campaignId) return null
    const role = this.memberships.get(userId)
    return role ? { role } : null
  }
  async createCampaignCharacter(input: CreateCampaignCharacterRecordInput) {
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
    if (!record) return null
    const worldCharacter = await this.findWorldCharacterById(
      record.worldCharacterId,
    )
    return worldCharacter
      ? { ...record, ownerUserId: worldCharacter.ownerUserId }
      : null
  }
  async listCampaignCharacters(id: string) {
    return this.records.filter((record) => record.campaignId === id)
  }
  async updateCampaignCharacter(
    id: string,
    input: UpdateCampaignCharacterRecordInput,
  ) {
    const record = await this.findCampaignCharacter(id)
    return record ? Object.assign(record, input) : null
  }
  async deleteCampaignCharacter(id: string) {
    const index = this.records.findIndex((record) => record.id === id)
    if (index === -1) return false
    this.records.splice(index, 1)
    return true
  }
}

describe('CampaignCharacter player attachment', () => {
  it('lets a PLAYER attach their own WorldCharacter after Campaign membership exists', async () => {
    const repository = new Repository()
    const service = new CampaignCharacterService(repository, () => createdId)

    await expect(
      service.createCampaignCharacter({
        actorUserId: playerId,
        worldCharacterId,
        campaignId,
      }),
    ).resolves.toMatchObject({
      id: createdId,
      worldCharacterId,
      campaignId,
      status: 'ACTIVE',
    })
  })

  it('does not let a SPECTATOR attach a Character', async () => {
    const service = new CampaignCharacterService(
      new Repository(),
      () => createdId,
    )

    await expect(
      service.createCampaignCharacter({
        actorUserId: spectatorId,
        worldCharacterId,
        campaignId,
      }),
    ).rejects.toMatchObject({
      code: 'CAMPAIGN_CHARACTER_PERMISSION_DENIED',
    })
  })

  it('does not let a PLAYER attach somebody else’s WorldCharacter', async () => {
    const service = new CampaignCharacterService(
      new Repository(),
      () => createdId,
    )

    await expect(
      service.createCampaignCharacter({
        actorUserId: playerId,
        worldCharacterId: otherWorldCharacterId,
        campaignId,
      }),
    ).rejects.toMatchObject({
      code: 'CAMPAIGN_CHARACTER_PERMISSION_DENIED',
    })
  })
})
