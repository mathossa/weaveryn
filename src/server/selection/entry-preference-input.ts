import { EntryPreferenceDomainError } from './entry-preferences'

export type EntryUseInput =
  | {
      kind: 'CHARACTER'
      worldCharacterId: string
      campaignId?: string | null
    }
  | {
      kind: 'WEAVER'
      worldId: string
      campaignId?: string | null
    }

function optionalId(value: unknown, field: string) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length === 0) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_INVALID',
      `${field} must be a non-empty string when provided.`,
    )
  }
  return value
}

export function parseEntryUseInput(value: unknown): EntryUseInput {
  if (!value || typeof value !== 'object') {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_INVALID',
      'Entry-use input must be an object.',
    )
  }

  const candidate = value as Record<string, unknown>
  if (candidate.kind === 'CHARACTER') {
    if (
      typeof candidate.worldCharacterId !== 'string' ||
      candidate.worldCharacterId.length === 0
    ) {
      throw new EntryPreferenceDomainError(
        'ENTRY_PREFERENCE_INVALID',
        'WorldCharacter ID is required for Character entry tracking.',
      )
    }
    return {
      kind: 'CHARACTER',
      worldCharacterId: candidate.worldCharacterId,
      campaignId: optionalId(candidate.campaignId, 'Campaign ID'),
    }
  }

  if (candidate.kind === 'WEAVER') {
    if (typeof candidate.worldId !== 'string' || candidate.worldId.length === 0) {
      throw new EntryPreferenceDomainError(
        'ENTRY_PREFERENCE_INVALID',
        'World ID is required for Weaver entry tracking.',
      )
    }
    return {
      kind: 'WEAVER',
      worldId: candidate.worldId,
      campaignId: optionalId(candidate.campaignId, 'Campaign ID'),
    }
  }

  throw new EntryPreferenceDomainError(
    'ENTRY_PREFERENCE_INVALID',
    'Entry-use kind must be CHARACTER or WEAVER.',
  )
}
