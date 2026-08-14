export type WorldDomainErrorCode =
  | 'WORLD_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'WORLD_MEMBERSHIP_NOT_FOUND'
  | 'WORLD_MEMBERSHIP_ALREADY_EXISTS'
  | 'WORLD_OWNER_CANNOT_BE_MEMBER'
  | 'WORLD_OWNER_CANNOT_LEAVE_MEMBERSHIP'
  | 'WORLD_PERMISSION_DENIED'
  | 'INVALID_WORLD_ROLE'

export class WorldDomainError extends Error {
  constructor(
    public readonly code: WorldDomainErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'WorldDomainError'
  }
}

export function worldNotFound(worldId: string) {
  return new WorldDomainError(
    'WORLD_NOT_FOUND',
    `World ${worldId} was not found.`,
  )
}

export function userNotFound(userId: string) {
  return new WorldDomainError(
    'USER_NOT_FOUND',
    `User ${userId} was not found.`,
  )
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

export function worldOwnerCannotLeaveMembership(worldId: string, userId: string) {
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
