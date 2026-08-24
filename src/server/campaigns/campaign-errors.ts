export type CampaignDomainErrorCode =
  | 'CAMPAIGN_MAIN_TIMELINE_NOT_FOUND'
  | 'CAMPAIGN_UPDATE_FORBIDDEN'
  | 'CAMPAIGN_NOT_FOUND'
  | 'CAMPAIGN_MEMBERSHIP_NOT_FOUND'
  | 'CAMPAIGN_MEMBERSHIP_ALREADY_EXISTS'
  | 'CAMPAIGN_MEMBERSHIP_FORBIDDEN'
  | 'CAMPAIGN_MEMBERSHIP_HAS_ACTIVE_CHARACTER'
  | 'CAMPAIGN_OWNER_MUST_BE_GM'
  | 'INVALID_CAMPAIGN_ROLE'
  | 'INVALID_CAMPAIGN_CAPABILITY'
  | 'CAMPAIGN_CAPABILITY_REQUIRES_PLAYER'
  | 'CAMPAIGN_LOCATION_INVALID'
  | 'CAMPAIGN_OWNERSHIP_TRANSFER_FORBIDDEN'
  | 'CAMPAIGN_SAME_OWNER'
  | 'CAMPAIGN_LIFECYCLE_FORBIDDEN'
  | 'CAMPAIGN_DELETE_FORBIDDEN'
  | 'CAMPAIGN_INVALID_STATUS_TRANSITION'
  | 'CAMPAIGN_ARCHIVED_READ_ONLY'
  | 'CAMPAIGN_STATE_CHANGED'
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
    'Campaign does not exist, is archived, or the user is not authorized to update the requested fields.',
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

export function campaignMembershipHasActiveCharacter(
  campaignId: string,
  userId: string,
) {
  return new CampaignDomainError(
    'CAMPAIGN_MEMBERSHIP_HAS_ACTIVE_CHARACTER',
    `User ${userId} still has active Character participation in Campaign ${campaignId}. Remove that Campaign Character participation before removing the membership.`,
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

export function invalidCampaignCapability(capability: unknown) {
  return new CampaignDomainError(
    'INVALID_CAMPAIGN_CAPABILITY',
    `${String(capability)} is not a valid Campaign capability.`,
  )
}

export function campaignCapabilityRequiresPlayer(
  campaignId: string,
  userId: string,
) {
  return new CampaignDomainError(
    'CAMPAIGN_CAPABILITY_REQUIRES_PLAYER',
    `User ${userId} must be a Threadwalker before receiving this capability in Campaign ${campaignId}.`,
  )
}

export function campaignLocationInvalid() {
  return new CampaignDomainError(
    'CAMPAIGN_LOCATION_INVALID',
    "Current Location must be a visible Location in this Campaign's World.",
  )
}

export function userNotFound(userId: string) {
  return new CampaignDomainError(
    'USER_NOT_FOUND',
    `User ${userId} was not found.`,
  )
}

export function campaignOwnershipTransferForbidden(
  campaignId: string,
  userId: string,
) {
  return new CampaignDomainError(
    'CAMPAIGN_OWNERSHIP_TRANSFER_FORBIDDEN',
    `User ${userId} is not authorized to transfer ownership of Campaign ${campaignId}.`,
  )
}

export function campaignSameOwner(campaignId: string) {
  return new CampaignDomainError(
    'CAMPAIGN_SAME_OWNER',
    `Campaign ${campaignId} is already owned by the requested user.`,
  )
}

export function campaignLifecycleForbidden(campaignId: string, userId: string) {
  return new CampaignDomainError(
    'CAMPAIGN_LIFECYCLE_FORBIDDEN',
    `User ${userId} is not authorized to change the lifecycle of Campaign ${campaignId}.`,
  )
}

export function campaignDeleteForbidden(campaignId: string, userId: string) {
  return new CampaignDomainError(
    'CAMPAIGN_DELETE_FORBIDDEN',
    `User ${userId} is not authorized to delete Campaign ${campaignId}.`,
  )
}

export function campaignInvalidStatusTransition(
  campaignId: string,
  currentStatus: string,
  requestedStatus: string,
) {
  return new CampaignDomainError(
    'CAMPAIGN_INVALID_STATUS_TRANSITION',
    `Campaign ${campaignId} cannot transition from ${currentStatus} to ${requestedStatus}.`,
  )
}

export function campaignArchivedReadOnly(campaignId: string) {
  return new CampaignDomainError(
    'CAMPAIGN_ARCHIVED_READ_ONLY',
    `Campaign ${campaignId} is archived and read-only.`,
  )
}

export function campaignStateChanged(campaignId: string) {
  return new CampaignDomainError(
    'CAMPAIGN_STATE_CHANGED',
    `Campaign ${campaignId} changed before the operation could complete.`,
  )
}
