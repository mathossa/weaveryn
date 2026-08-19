import {
  WORLD_CHARACTER_PROFILE_FIELDS,
  type WorldCharacterProfile,
  type WorldCharacterProfileFieldKey,
} from '@/lib/world-character-profile'

export class CharacterInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CharacterInputError'
  }
}

function objectInput(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CharacterInputError('Character input must be an object.')
  }
  return value as Record<string, unknown>
}

function requiredName(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CharacterInputError('Character name is required.')
  }
  const name = value.trim()
  if (name.length > 120) {
    throw new CharacterInputError(
      'Character name must be 120 characters or fewer.',
    )
  }
  return name
}

function optionalNameOverride(value: unknown) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    throw new CharacterInputError('World-specific name must be text.')
  }
  const name = value.trim()
  if (name.length > 120) {
    throw new CharacterInputError(
      'World-specific name must be 120 characters or fewer.',
    )
  }
  return name || null
}

function requiredId(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CharacterInputError(`${label} is required.`)
  }
  return value.trim()
}

function profileInput(value: unknown): WorldCharacterProfile {
  const profile = objectInput(value)
  const valuesInput = objectInput(profile.values ?? {})
  const values: WorldCharacterProfile['values'] = {}

  for (const field of WORLD_CHARACTER_PROFILE_FIELDS) {
    const fieldValue = valuesInput[field.key]
    if (fieldValue === undefined || fieldValue === null) continue
    if (typeof fieldValue !== 'string') {
      throw new CharacterInputError(`${field.label} must be text.`)
    }
    const normalized = fieldValue.trim()
    if (normalized.length > 2000) {
      throw new CharacterInputError(
        `${field.label} must be 2000 characters or fewer.`,
      )
    }
    if (normalized) values[field.key] = normalized
  }

  const knownKeys = new Set<WorldCharacterProfileFieldKey>(
    WORLD_CHARACTER_PROFILE_FIELDS.map((field) => field.key),
  )
  const hiddenInput = profile.hiddenFields ?? []
  if (!Array.isArray(hiddenInput)) {
    throw new CharacterInputError('Hidden Character profile fields must be a list.')
  }
  const hiddenFields = hiddenInput.map((key) => {
    if (
      typeof key !== 'string' ||
      !knownKeys.has(key as WorldCharacterProfileFieldKey)
    ) {
      throw new CharacterInputError('Unknown Character profile field.')
    }
    return key as WorldCharacterProfileFieldKey
  })

  return { values, hiddenFields: [...new Set(hiddenFields)] }
}

export function parseCreateCharacterInput(value: unknown) {
  const input = objectInput(value)
  return { name: requiredName(input.name) }
}

export function parseUpdateCharacterInput(value: unknown) {
  const input = objectInput(value)
  return { name: requiredName(input.name) }
}

export function parseCreateWorldCharacterInput(value: unknown) {
  const input = objectInput(value)
  return {
    worldId: requiredId(input.worldId, 'World'),
    nameOverride: optionalNameOverride(input.nameOverride),
  }
}

export function parseUpdateWorldCharacterInput(value: unknown) {
  const input = objectInput(value)
  return {
    ...(Object.hasOwn(input, 'nameOverride')
      ? { nameOverride: optionalNameOverride(input.nameOverride) }
      : {}),
    ...(Object.hasOwn(input, 'profile')
      ? { profile: profileInput(input.profile) }
      : {}),
  }
}

export function parseAttachCampaignCharacterInput(value: unknown) {
  const input = objectInput(value)
  return { campaignId: requiredId(input.campaignId, 'Campaign') }
}
