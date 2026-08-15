export type CampaignCharacterDomainErrorCode =
  | 'CAMPAIGN_CHARACTER_NOT_FOUND'
  | 'CAMPAIGN_CHARACTER_ALREADY_EXISTS'
  | 'CAMPAIGN_CHARACTER_CROSS_WORLD'
  | 'CAMPAIGN_CHARACTER_PERMISSION_DENIED'
  | 'CAMPAIGN_CHARACTER_WORLD_CHARACTER_NOT_FOUND'
  | 'CAMPAIGN_CHARACTER_CAMPAIGN_NOT_FOUND'

export class CampaignCharacterDomainError extends Error {
  constructor(
    public readonly code: CampaignCharacterDomainErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'CampaignCharacterDomainError'
  }
}

export const campaignCharacterNotFound = (campaignCharacterId: string) =>
  new CampaignCharacterDomainError(
    'CAMPAIGN_CHARACTER_NOT_FOUND',
    `CampaignCharacter ${campaignCharacterId} was not found.`,
  )

export const campaignCharacterAlreadyExists = (
  worldCharacterId: string,
  campaignId: string,
) =>
  new CampaignCharacterDomainError(
    'CAMPAIGN_CHARACTER_ALREADY_EXISTS',
    `WorldCharacter ${worldCharacterId} already participates in Campaign ${campaignId}.`,
  )

export const campaignCharacterCrossWorld = (
  worldCharacterId: string,
  campaignId: string,
) =>
  new CampaignCharacterDomainError(
    'CAMPAIGN_CHARACTER_CROSS_WORLD',
    `WorldCharacter ${worldCharacterId} cannot participate in Campaign ${campaignId} because they belong to different Worlds.`,
  )

export const campaignCharacterPermissionDenied = (
  campaignId: string,
  userId: string,
) =>
  new CampaignCharacterDomainError(
    'CAMPAIGN_CHARACTER_PERMISSION_DENIED',
    `User ${userId} cannot manage CampaignCharacter participation in Campaign ${campaignId}.`,
  )

export const campaignCharacterWorldCharacterNotFound = (id: string) =>
  new CampaignCharacterDomainError(
    'CAMPAIGN_CHARACTER_WORLD_CHARACTER_NOT_FOUND',
    `WorldCharacter ${id} was not found.`,
  )

export const campaignCharacterCampaignNotFound = (id: string) =>
  new CampaignCharacterDomainError(
    'CAMPAIGN_CHARACTER_CAMPAIGN_NOT_FOUND',
    `Campaign ${id} was not found.`,
  )
