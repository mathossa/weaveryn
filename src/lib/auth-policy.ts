export const AUTH_PASSWORD_MIN_LENGTH = 8

export const AUTH_USERNAME_MIN_LENGTH = 3
export const AUTH_USERNAME_MAX_LENGTH = 30

const usernamePattern = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/
const reservedUsernames = new Set([
  'admin',
  'administrator',
  'root',
  'system',
  'support',
  'staff',
  'moderator',
  'mod',
  'official',
  'weaveryn',
])

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function usernameValidationMessage(value: string) {
  const username = normalizeUsername(value)

  if (
    username.length < AUTH_USERNAME_MIN_LENGTH ||
    username.length > AUTH_USERNAME_MAX_LENGTH
  ) {
    return `Username must be ${AUTH_USERNAME_MIN_LENGTH}-${AUTH_USERNAME_MAX_LENGTH} characters.`
  }

  if (!usernamePattern.test(username)) {
    return 'Username may use letters, numbers, dots, underscores, and hyphens, and must start and end with a letter or number.'
  }

  if (reservedUsernames.has(username)) {
    return 'That username is reserved. Choose another username.'
  }

  return null
}
