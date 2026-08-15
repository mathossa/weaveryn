export type CampaignDomainErrorCode =
  | 'CAMPAIGN_MAIN_TIMELINE_NOT_FOUND'
  | 'CAMPAIGN_UPDATE_FORBIDDEN'
  | 'CAMPAIGN_NOT_FOUND'
  | 'CAMPAIGN_MEMBERSHIP_NOT_FOUND'
  | 'CAMPAIGN_MEMBERSHIP_ALREADY_EXISTS'
  | 'CAMPAIGN_MEMBERSHIP_FORBIDDEN'
  | 'CAMPAIGN_OWNER_MUST_BE_GM'
  | 'INVALID_CAMPAIGN_ROLE'
  | 'USER_NOT_FOUND'

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

export function campaignNotFound(campaignId: string) {
  return new CampaignDomainError(
    'CAMPAIGN_NOT_FOUND',
    `Campaign ${campaignId} was not found.`,
  )
}

export function campaignMembershipNotFound(campaignId: string, userId: string) {
  return new CampaignDomainError(
    'CAMPAIGN_MEMBERSHIP_NOT_FOUND',
    `User ${userId} is not a member of Campaign ${campaignId}.`,
  )
}

export function campaignMembershipAlreadyExists(
  campaignId: string,
  userId: string,
) {
  return new CampaignDomainError(
    'CAMPAIGN_MEMBERSHIP_ALREADY_EXISTS',
    `User ${userId} is already a member of Campaign ${campaignId}.`,
  )
}

export function campaignMembershipForbidden(
  campaignId: string,
  userId: string,
) {
  return new CampaignDomainError(
    'CAMPAIGN_MEMBERSHIP_FORBIDDEN',
    `User ${userId} does not control membership in Campaign ${campaignId}.`,
  )
}

export function campaignOwnerMustBeGm(campaignId: string, userId: string) {
  return new CampaignDomainError(
    'CAMPAIGN_OWNER_MUST_BE_GM',
    `Campaign owner ${userId} must retain the GM membership in Campaign ${campaignId}.`,
  )
}

export function invalidCampaignRole(role: unknown) {
  return new CampaignDomainError(
    'INVALID_CAMPAIGN_ROLE',
    `${String(role)} is not a valid Campaign role.`,
  )
}

export function userNotFound(userId: string) {
  return new CampaignDomainError(
    'USER_NOT_FOUND',
    `User ${userId} was not found.`,
  )
}
