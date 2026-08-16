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
    throw new CharacterInputError('Character name must be 120 characters or fewer.')
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
  return { nameOverride: optionalNameOverride(input.nameOverride) }
}

export function parseAttachCampaignCharacterInput(value: unknown) {
  const input = objectInput(value)
  return { campaignId: requiredId(input.campaignId, 'Campaign') }
}
