export type CampaignDomainErrorCode =
  'CAMPAIGN_MAIN_TIMELINE_NOT_FOUND' | 'CAMPAIGN_UPDATE_FORBIDDEN'

export class CampaignDomainError extends Error {
  constructor(
    public readonly code: CampaignDomainErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'CampaignDomainError'
  }
}

export function campaignMainTimelineNotFound(worldId: string) {
  return new CampaignDomainError(
    'CAMPAIGN_MAIN_TIMELINE_NOT_FOUND',
    `World ${worldId} does not have a main timeline.`,
  )
}

export function campaignUpdateForbidden() {
  return new CampaignDomainError(
    'CAMPAIGN_UPDATE_FORBIDDEN',
    'Campaign does not exist, is archived, or the user is not its owner.',
  )
}
