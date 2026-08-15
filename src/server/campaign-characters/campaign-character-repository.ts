import type { CampaignRole } from '../campaigns/campaign-role'

export type CampaignCharacterData = Record<string, unknown>

export interface CampaignCharacterRecord {
  id: string
  worldCharacterId: string
  campaignId: string
  sheetData: unknown
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface WorldCharacterReference {
  id: string
  worldId: string
  ownerUserId: string
}

export interface CampaignReference {
  id: string
  worldId: string | null
  ownerId: string
}

export interface CreateCampaignCharacterRecordInput {
  id: string
  worldCharacterId: string
  campaignId: string
  sheetData: CampaignCharacterData
  status?: string
}

export interface UpdateCampaignCharacterRecordInput {
  sheetData?: CampaignCharacterData
  status?: string
}

export class CampaignCharacterRepositoryConflictError extends Error {
  constructor() {
    super(
      'A CampaignCharacter already exists for this WorldCharacter and Campaign.',
    )
    this.name = 'CampaignCharacterRepositoryConflictError'
  }
}

export interface CampaignCharacterRepository {
  runInTransaction<T>(
    operation: (repository: CampaignCharacterRepository) => Promise<T>,
  ): Promise<T>
  findWorldCharacterById(id: string): Promise<WorldCharacterReference | null>
  findCampaignById(id: string): Promise<CampaignReference | null>
  findCampaignMembership(
    campaignId: string,
    userId: string,
  ): Promise<{ role: CampaignRole } | null>
  createCampaignCharacter(
    input: CreateCampaignCharacterRecordInput,
  ): Promise<CampaignCharacterRecord>
  findCampaignCharacter(id: string): Promise<CampaignCharacterRecord | null>
  findCampaignCharacterWithOwner(
    id: string,
  ): Promise<(CampaignCharacterRecord & { ownerUserId: string }) | null>
  listCampaignCharacters(campaignId: string): Promise<CampaignCharacterRecord[]>
  updateCampaignCharacter(
    id: string,
    input: UpdateCampaignCharacterRecordInput,
  ): Promise<CampaignCharacterRecord | null>
  deleteCampaignCharacter(id: string): Promise<boolean>
}
