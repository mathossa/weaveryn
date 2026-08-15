export type WorldDomainErrorCode =
  | 'WORLD_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'WORLD_MEMBERSHIP_NOT_FOUND'
  | 'WORLD_MEMBERSHIP_ALREADY_EXISTS'
  | 'WORLD_OWNER_CANNOT_BE_MEMBER'
  | 'WORLD_OWNER_CANNOT_LEAVE_MEMBERSHIP'
  | 'WORLD_PERMISSION_DENIED'
  | 'INVALID_WORLD_ROLE'
  | 'WORLD_UPDATE_FORBIDDEN'
  | 'INVALID_FORMER_OWNER_ROLE'
  | 'NEW_OWNER_NOT_FOUND'
  | 'NOT_WORLD_OWNER'
  | 'SAME_OWNER'
  | 'WORLD_NOT_ORPHANED'
  | 'WORLD_OWNERSHIP_CLAIM_FORBIDDEN'
  | 'ORPHANED_WORLD_CHANGED'
  | 'ORPHANED_WORLD_CLEANUP_BLOCKED_BY_ACTIVE_CAMPAIGNS'
  | 'ORPHANED_WORLD_CLEANUP_BLOCKED_BY_SUCCESSOR'
  | 'ORPHANED_WORLD_CLEANUP_REQUIRES_CAMPAIGN_RESOLUTION'

export class WorldDomainError extends Error {
  constructor(
    public readonly code: WorldDomainErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'WorldDomainError'
  }
}

export function worldNotFound(
  worldId: string,
  message = `World ${worldId} was not found.`,
) {
  return new WorldDomainError('WORLD_NOT_FOUND', message)
}

export function userNotFound(userId: string) {
  return new WorldDomainError('USER_NOT_FOUND', `User ${userId} was not found.`)
}

export function worldMembershipNotFound(worldId: string, userId: string) {
  return new WorldDomainError(
    'WORLD_MEMBERSHIP_NOT_FOUND',
    `User ${userId} is not a member of World ${worldId}.`,
  )
}

export function worldMembershipAlreadyExists(worldId: string, userId: string) {
  return new WorldDomainError(
    'WORLD_MEMBERSHIP_ALREADY_EXISTS',
    `User ${userId} is already a member of World ${worldId}.`,
  )
}

export function worldOwnerCannotBeMember(worldId: string, userId: string) {
  return new WorldDomainError(
    'WORLD_OWNER_CANNOT_BE_MEMBER',
    `World owner ${userId} cannot also be a member of World ${worldId}.`,
  )
}

export function worldOwnerCannotLeaveMembership(
  worldId: string,
  userId: string,
) {
  return new WorldDomainError(
    'WORLD_OWNER_CANNOT_LEAVE_MEMBERSHIP',
    `World owner ${userId} must transfer or relinquish ownership of World ${worldId} instead of leaving a membership.`,
  )
}

export function worldPermissionDenied(worldId: string, userId: string) {
  return new WorldDomainError(
    'WORLD_PERMISSION_DENIED',
    `User ${userId} does not have permission to perform this action in World ${worldId}.`,
  )
}

export function invalidWorldRole(role: unknown) {
  return new WorldDomainError(
    'INVALID_WORLD_ROLE',
    `${String(role)} is not a valid World role.`,
  )
}

export function worldUpdateForbidden() {
  return new WorldDomainError(
    'WORLD_UPDATE_FORBIDDEN',
    'World does not exist or the user is not authorized to update it.',
  )
}

export function invalidFormerOwnerRole() {
  return new WorldDomainError(
    'INVALID_FORMER_OWNER_ROLE',
    'Former owner membership role must be ADMIN, MEMBER, VIEWER, or null',
  )
}

export function newWorldOwnerNotFound() {
  return new WorldDomainError(
    'NEW_OWNER_NOT_FOUND',
    'New World owner not found',
  )
}

export function notWorldOwner(message: string) {
  return new WorldDomainError('NOT_WORLD_OWNER', message)
}

export function sameWorldOwner() {
  return new WorldDomainError(
    'SAME_OWNER',
    'World ownership cannot be transferred to the current owner',
  )
}

export function worldNotOrphaned(worldId: string) {
  return new WorldDomainError(
    'WORLD_NOT_ORPHANED',
    `World ${worldId} is not orphaned.`,
  )
}

export function worldOwnershipClaimForbidden(worldId: string, userId: string) {
  return new WorldDomainError(
    'WORLD_OWNERSHIP_CLAIM_FORBIDDEN',
    `User ${userId} is not eligible to claim orphaned World ${worldId}.`,
  )
}

export function orphanedWorldChanged(worldId: string) {
  return new WorldDomainError(
    'ORPHANED_WORLD_CHANGED',
    `Orphaned World ${worldId} changed before the operation could complete.`,
  )
}

export function orphanedWorldCleanupBlockedByActiveCampaigns(worldId: string) {
  return new WorldDomainError(
    'ORPHANED_WORLD_CLEANUP_BLOCKED_BY_ACTIVE_CAMPAIGNS',
    `Orphaned World ${worldId} cannot be removed while it has active Campaigns.`,
  )
}

export function orphanedWorldCleanupBlockedBySuccessor(worldId: string) {
  return new WorldDomainError(
    'ORPHANED_WORLD_CLEANUP_BLOCKED_BY_SUCCESSOR',
    `Orphaned World ${worldId} cannot be removed while an eligible successor exists.`,
  )
}

export function orphanedWorldCleanupRequiresCampaignResolution(
  worldId: string,
) {
  return new WorldDomainError(
    'ORPHANED_WORLD_CLEANUP_REQUIRES_CAMPAIGN_RESOLUTION',
    `Orphaned World ${worldId} still has ended or archived Campaign references that must be detached through the Campaign archival workflow.`,
  )
}
