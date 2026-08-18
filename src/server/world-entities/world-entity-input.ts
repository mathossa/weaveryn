import type {
  CreateEntityRelationshipInput,
  CreateWorldEntityInput,
  EntityVisibilityInput,
  InitialEntityRelationshipInput,
  UpdateWorldEntityInput,
} from './world-entity-service'
import type { StructuredData, VisibilityScope } from './world-entity-repository'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VISIBILITY_SCOPES = new Set<VisibilityScope>([
  'WORLD',
  'CAMPAIGN',
  'GM',
  'PLAYER',
  'PRIVATE',
])

export class WorldEntityInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorldEntityInputError'
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorldEntityInputError('Expected a JSON object.')
  }
  return value as Record<string, unknown>
}

function requiredString(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    throw new WorldEntityInputError(`${label} is required.`)
  }
  const trimmed = value.trim()
  if (!trimmed) throw new WorldEntityInputError(`${label} is required.`)
  if (trimmed.length > maxLength) {
    throw new WorldEntityInputError(
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
    throw new WorldEntityInputError(`${label} must be text.`)
  }
  const trimmed = value.trim()
  if (trimmed.length > maxLength) {
    throw new WorldEntityInputError(
      `${label} must be ${maxLength} characters or fewer.`,
    )
  }
  return trimmed || null
}

function optionalUuid(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new WorldEntityInputError(`${label} must be a valid UUID.`)
  }
  return value
}

function requiredUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new WorldEntityInputError(`${label} must be a valid UUID.`)
  }
  return value
}

function optionalFocus(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new WorldEntityInputError(`${label} must be an integer from 0 to 100.`)
  }
  return value
}

function parseVisibility(value: unknown): EntityVisibilityInput | undefined {
  if (value === undefined) return undefined
  const input = asObject(value)
  const scope = input.scope
  if (typeof scope !== 'string' || !VISIBILITY_SCOPES.has(scope as VisibilityScope)) {
    throw new WorldEntityInputError('Visibility scope is invalid.')
  }
  return {
    scope: scope as VisibilityScope,
    campaignId: optionalUuid(input.campaignId, 'Visibility Campaign'),
    userId: optionalUuid(input.userId, 'Visibility User'),
  }
}

function parseStructuredData(value: unknown): StructuredData | undefined {
  if (value === undefined) return undefined
  const input = asObject(value)
  const entries = Object.entries(input)
  if (entries.length > 50) {
    throw new WorldEntityInputError('An entity may have at most 50 custom fields.')
  }

  const result: StructuredData = {}
  for (const [rawKey, fieldValue] of entries) {
    const key = rawKey.trim()
    if (!key || key.length > 80) {
      throw new WorldEntityInputError(
        'Custom field names must be between 1 and 80 characters.',
      )
    }
    if (typeof fieldValue === 'string') {
      if (fieldValue.length > 2000) {
        throw new WorldEntityInputError(
          `Custom field "${key}" must be 2000 characters or fewer.`,
        )
      }
      result[key] = fieldValue
      continue
    }
    if (typeof fieldValue === 'number') {
      if (!Number.isFinite(fieldValue)) {
        throw new WorldEntityInputError(
          `Custom field "${key}" must be a finite number.`,
        )
      }
      result[key] = fieldValue
      continue
    }
    if (typeof fieldValue === 'boolean') {
      result[key] = fieldValue
      continue
    }
    throw new WorldEntityInputError(
      `Custom field "${key}" must be text, a number, or a boolean.`,
    )
  }
  return result
}

function parseInitialRelationships(value: unknown): InitialEntityRelationshipInput[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    throw new WorldEntityInputError('Initial relationships must be a list.')
  }
  if (value.length > 20) {
    throw new WorldEntityInputError(
      'An entity may define at most 20 initial relationships.',
    )
  }
  return value.map((entry, index) => {
    const input = asObject(entry)
    return {
      targetEntityId: requiredUuid(
        input.targetEntityId,
        `Initial relationship ${index + 1} target`,
      ),
      relationshipType: requiredString(
        input.relationshipType,
        `Initial relationship ${index + 1} type`,
        80,
      ),
      label: optionalString(
        input.label,
        `Initial relationship ${index + 1} label`,
        240,
      ),
    }
  })
}

export function parseCreateWorldEntityInput(value: unknown): Omit<
  CreateWorldEntityInput,
  'actorUserId' | 'worldId'
> {
  const input = asObject(value)
  return {
    type: requiredString(input.type, 'Entity type', 80),
    name: requiredString(input.name, 'Entity name', 160),
    description: optionalString(input.description, 'Description', 10000),
    image: optionalString(input.image, 'Image', 2000),
    imageFocusX: optionalFocus(input.imageFocusX, 'Image focus X'),
    imageFocusY: optionalFocus(input.imageFocusY, 'Image focus Y'),
    data: parseStructuredData(input.data),
    contextCampaignId: optionalUuid(input.contextCampaignId, 'Campaign context'),
    visibility: parseVisibility(input.visibility),
    initialRelationships: parseInitialRelationships(input.initialRelationships),
  }
}

export function parseUpdateWorldEntityInput(value: unknown): UpdateWorldEntityInput {
  const input = asObject(value)
  const result: UpdateWorldEntityInput = {}

  if (input.type !== undefined) {
    result.type = requiredString(input.type, 'Entity type', 80)
  }
  if (input.name !== undefined) {
    result.name = requiredString(input.name, 'Entity name', 160)
  }
  if (input.description !== undefined) {
    result.description = optionalString(input.description, 'Description', 10000)
  }
  if (input.image !== undefined) {
    result.image = optionalString(input.image, 'Image', 2000)
  }
  if (input.imageFocusX !== undefined) {
    result.imageFocusX = optionalFocus(input.imageFocusX, 'Image focus X')
  }
  if (input.imageFocusY !== undefined) {
    result.imageFocusY = optionalFocus(input.imageFocusY, 'Image focus Y')
  }
  if (input.data !== undefined) result.data = parseStructuredData(input.data)
  if (input.contextCampaignId !== undefined) {
    result.contextCampaignId = optionalUuid(
      input.contextCampaignId,
      'Campaign context',
    )
  }
  if (input.visibility !== undefined) {
    result.visibility = parseVisibility(input.visibility)
  }

  if (Object.keys(result).length === 0) {
    throw new WorldEntityInputError('At least one entity field must be provided.')
  }
  return result
}

export function parseCreateEntityRelationshipInput(value: unknown): Omit<
  CreateEntityRelationshipInput,
  'actorUserId' | 'worldId'
> {
  const input = asObject(value)
  return {
    sourceEntityId: requiredUuid(input.sourceEntityId, 'Source entity'),
    targetEntityId: requiredUuid(input.targetEntityId, 'Target entity'),
    relationshipType: requiredString(
      input.relationshipType,
      'Relationship type',
      80,
    ),
    label: optionalString(input.label, 'Relationship label', 240),
    contextCampaignId: optionalUuid(input.contextCampaignId, 'Campaign context'),
    visibility: parseVisibility(input.visibility),
  }
}
