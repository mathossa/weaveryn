export const AUTH_PASSWORD_MIN_LENGTH = 15

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

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]'])

export function shouldUseSecureAuthCookies({
  nodeEnv,
  baseURL,
  e2eRunId,
}: {
  nodeEnv?: string
  baseURL?: string
  e2eRunId?: string
}) {
  if (nodeEnv !== 'production') return false

  // The production E2E server intentionally runs Next.js in production mode
  // over disposable loopback HTTP. Allow that harness to exercise authenticated
  // requests without weakening cookies for any deployable production URL.
  if (e2eRunId && baseURL) {
    try {
      const url = new URL(baseURL)
      if (url.protocol === 'http:' && loopbackHosts.has(url.hostname)) {
        return false
      }
    } catch {
      // Invalid/missing production URLs fail closed to Secure cookies.
    }
  }

  return true
}

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
