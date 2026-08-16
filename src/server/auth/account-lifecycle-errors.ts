export type AccountLifecycleErrorCode =
  'ACCOUNT_NOT_FOUND' | 'ACCOUNT_DELETION_BLOCKED'

export type AccountDeletionBlocker = 'CAMPAIGNS' | 'CHARACTERS'

export class AccountLifecycleError extends Error {
  constructor(
    readonly code: AccountLifecycleErrorCode,
    message: string,
    readonly blockers: readonly AccountDeletionBlocker[] = [],
  ) {
    super(message)
    this.name = 'AccountLifecycleError'
  }
}

export const accountNotFound = (userId: string) =>
  new AccountLifecycleError(
    'ACCOUNT_NOT_FOUND',
    `User ${userId} does not exist.`,
  )

export const accountDeletionBlocked = (
  blockers: readonly AccountDeletionBlocker[],
) =>
  new AccountLifecycleError(
    'ACCOUNT_DELETION_BLOCKED',
    `Account deletion is blocked by unresolved owned ${blockers.join(' and ').toLowerCase()}.`,
    blockers,
  )
