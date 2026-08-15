const DEFAULT_DEV_DATABASE_NAME = 'weaveryn_dev'

export type DevEnvironmentFailureCode =
  | 'DEV_TOOLS_DISABLED'
  | 'DATABASE_URL_MISSING'
  | 'DEV_DATABASE_NAME_INVALID'
  | 'UNSAFE_DEV_DATABASE'

export interface DevEnvironmentStatus {
  safe: boolean
  expectedDatabaseName: string
  actualDatabaseName: string | null
  code?: DevEnvironmentFailureCode
  message: string
}

export class DevEnvironmentError extends Error {
  constructor(
    readonly code: DevEnvironmentFailureCode,
    message: string,
  ) {
    super(message)
    this.name = 'DevEnvironmentError'
  }
}

export function databaseNameFromUrl(value: string) {
  try {
    const url = new URL(value)
    const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    return databaseName || null
  } catch {
    return null
  }
}

export function isClearlyDevelopmentDatabaseName(name: string) {
  return /(^|[-_])(dev|test)([-_]|$)/i.test(name)
}

export function getDevEnvironmentStatus(
  environment: NodeJS.ProcessEnv = process.env,
): DevEnvironmentStatus {
  const expectedDatabaseName =
    environment.DEV_DATABASE_NAME ?? DEFAULT_DEV_DATABASE_NAME

  if (environment.NODE_ENV === 'production') {
    return {
      safe: false,
      expectedDatabaseName,
      actualDatabaseName: null,
      code: 'DEV_TOOLS_DISABLED',
      message: 'Development scenarios are unavailable in production.',
    }
  }

  if (!isClearlyDevelopmentDatabaseName(expectedDatabaseName)) {
    return {
      safe: false,
      expectedDatabaseName,
      actualDatabaseName: null,
      code: 'DEV_DATABASE_NAME_INVALID',
      message:
        'DEV_DATABASE_NAME must be clearly marked as a development or test database.',
    }
  }

  if (!environment.DATABASE_URL) {
    return {
      safe: false,
      expectedDatabaseName,
      actualDatabaseName: null,
      code: 'DATABASE_URL_MISSING',
      message:
        'DATABASE_URL is required before a development scenario can run.',
    }
  }

  const actualDatabaseName = databaseNameFromUrl(environment.DATABASE_URL)

  if (actualDatabaseName !== expectedDatabaseName) {
    return {
      safe: false,
      expectedDatabaseName,
      actualDatabaseName,
      code: 'UNSAFE_DEV_DATABASE',
      message: `Development scenarios require database "${expectedDatabaseName}"; the configured URL targets "${actualDatabaseName ?? 'an unreadable database name'}".`,
    }
  }

  return {
    safe: true,
    expectedDatabaseName,
    actualDatabaseName,
    message: `Development scenarios are isolated to database "${actualDatabaseName}".`,
  }
}

export function assertSafeDevEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const status = getDevEnvironmentStatus(environment)

  if (!status.safe) {
    throw new DevEnvironmentError(
      status.code ?? 'UNSAFE_DEV_DATABASE',
      status.message,
    )
  }

  return status
}
