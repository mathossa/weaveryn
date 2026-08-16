export class InstanceAdminError extends Error {
  constructor(
    message: string,
    public readonly code: 'USER_NOT_FOUND' | 'LAST_ADMIN',
  ) {
    super(message)
    this.name = 'InstanceAdminError'
  }
}

export function instanceAdminUserNotFound(identifier: string) {
  return new InstanceAdminError(
    `No user found for identifier: ${identifier}`,
    'USER_NOT_FOUND',
  )
}

export function lastInstanceAdminCannotBeDemoted() {
  return new InstanceAdminError(
    'The last instance administrator cannot be demoted.',
    'LAST_ADMIN',
  )
}
