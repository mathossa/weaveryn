export type MembershipInvitationErrorCode =
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_REVOKED'
  | 'INVITATION_ALREADY_USED'
  | 'INVITATION_ALREADY_MEMBER'
  | 'INVITATION_TARGET_UNAVAILABLE'
  | 'INVITATION_INVALID_TOKEN'

export class MembershipInvitationDomainError extends Error {
  constructor(
    readonly code: MembershipInvitationErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'MembershipInvitationDomainError'
  }
}

export function invitationNotFound() {
  return new MembershipInvitationDomainError(
    'INVITATION_NOT_FOUND',
    'This invitation could not be found.',
  )
}

export function invitationExpired() {
  return new MembershipInvitationDomainError(
    'INVITATION_EXPIRED',
    'This invitation has expired.',
  )
}

export function invitationRevoked() {
  return new MembershipInvitationDomainError(
    'INVITATION_REVOKED',
    'This invitation has been revoked.',
  )
}

export function invitationAlreadyUsed() {
  return new MembershipInvitationDomainError(
    'INVITATION_ALREADY_USED',
    'This invitation has already been used.',
  )
}

export function invitationAlreadyMember() {
  return new MembershipInvitationDomainError(
    'INVITATION_ALREADY_MEMBER',
    'You already belong to this destination.',
  )
}

export function invitationTargetUnavailable() {
  return new MembershipInvitationDomainError(
    'INVITATION_TARGET_UNAVAILABLE',
    'This invitation no longer points to an active joinable destination.',
  )
}

export function invitationInvalidToken() {
  return new MembershipInvitationDomainError(
    'INVITATION_INVALID_TOKEN',
    'This invitation link is invalid.',
  )
}
