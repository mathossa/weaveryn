import type { WorldDateInput } from './world-date-resolver'
import type {
  CreateWorldEventInput,
  CreateWorldReckoningInput,
  UpdateWorldEventInput,
} from './world-event-service'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class WorldEventInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorldEventInputError'
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorldEventInputError('Expected a JSON object.')
  }
  return value as Record<string, unknown>
}

function requiredString(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string') {
    throw new WorldEventInputError(`${label} is required.`)
  }
  const trimmed = value.trim()
  if (!trimmed) throw new WorldEventInputError(`${label} is required.`)
  if (trimmed.length > maxLength) {
    throw new WorldEventInputError(
      `${label} must be ${maxLength} characters or fewer.`,
    )
  }
  return trimmed
}

function optionalString(
  value: unknown,
  label: string,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new WorldEventInputError(`${label} must be text.`)
  }
  const trimmed = value.trim()
  if (trimmed.length > maxLength) {
    throw new WorldEventInputError(
      `${label} must be ${maxLength} characters or fewer.`,
    )
  }
  return trimmed || null
}

function optionalUuid(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new WorldEventInputError(`${label} must be a valid UUID.`)
  }
  return value
}

function parseDate(value: unknown, label: string): WorldDateInput {
  const input = asObject(value)
  const year = requiredString(input.year, `${label} year`, 40)
  const reckoningId = optionalUuid(input.reckoningId, `${label} year system`)
  const direction = input.direction

  if (
    direction !== undefined &&
    direction !== null &&
    direction !== '' &&
    direction !== 'BEFORE' &&
    direction !== 'AFTER'
  ) {
    throw new WorldEventInputError(`${label} direction is invalid.`)
  }

  return {
    year,
    reckoningId,
    direction:
      direction === 'BEFORE' || direction === 'AFTER' ? direction : undefined,
  }
}

function parseOptionalDate(value: unknown, label: string) {
  if (value === undefined || value === null) return undefined
  return parseDate(value, label)
}

function parseEntityIds(value: unknown): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new WorldEventInputError('Linked entities must be a list.')
  }
  if (value.length > 30) {
    throw new WorldEventInputError('An event may link at most 30 entities.')
  }

  const ids = value.map((entry, index) => {
    if (typeof entry !== 'string' || !UUID_PATTERN.test(entry)) {
      throw new WorldEventInputError(
        `Linked entity ${index + 1} must be a valid UUID.`,
      )
    }
    return entry
  })
  return [...new Set(ids)]
}

function parseEventFields(value: unknown) {
  const input = asObject(value)
  return {
    title: requiredString(input.title, 'Event title', 160),
    description: optionalString(input.description, 'Description', 10_000),
    startDate: parseDate(input.startDate, 'Start date'),
    endDate: parseOptionalDate(input.endDate, 'End date'),
    entityIds: parseEntityIds(input.entityIds),
  }
}

export function parseCreateWorldEventInput(
  value: unknown,
): Omit<CreateWorldEventInput, 'actorUserId' | 'worldId'> {
  return parseEventFields(value)
}

export function parseUpdateWorldEventInput(
  value: unknown,
): UpdateWorldEventInput {
  return parseEventFields(value)
}

export function parseCreateWorldReckoningInput(
  value: unknown,
): Omit<CreateWorldReckoningInput, 'actorUserId' | 'worldId'> {
  const input = asObject(value)
  return {
    name: requiredString(input.name, 'Year system name', 120),
    anchorDate: parseDate(input.anchorDate, 'Anchor date'),
    beforeLabel: requiredString(input.beforeLabel, 'Before label', 120),
    beforeAbbreviation: optionalString(
      input.beforeAbbreviation,
      'Before abbreviation',
      24,
    ),
    afterLabel: requiredString(input.afterLabel, 'After label', 120),
    afterAbbreviation: optionalString(
      input.afterAbbreviation,
      'After abbreviation',
      24,
    ),
  }
}
