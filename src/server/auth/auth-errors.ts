export type AuthDomainErrorCode =
  'UNAUTHENTICATED' | 'AUTHENTICATED_USER_NOT_FOUND'

export class AuthDomainError extends Error {
  constructor(
    readonly code: AuthDomainErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AuthDomainError'
  }
}

export const unauthenticated = () =>
  new AuthDomainError('UNAUTHENTICATED', 'Authentication is required.')

export const authenticatedUserNotFound = (userId: string) =>
  new AuthDomainError(
    'AUTHENTICATED_USER_NOT_FOUND',
    `Authenticated User ${userId} no longer exists.`,
  )
