import { EntryPreferenceDomainError } from './entry-preferences'

export type EntryPinInput =
  | {
      kind: 'CHARACTER'
      worldCharacterId: string
      campaignId?: string | null
      pinned: boolean
    }
  | {
      kind: 'PORTABLE_CHARACTER'
      characterId: string
      pinned: boolean
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

export function parseEntryPinInput(value: unknown): EntryPinInput {
  if (!value || typeof value !== 'object') {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_INVALID',
      'Entry preference input must be an object.',
    )
  }

  const candidate = value as Record<string, unknown>
  if (typeof candidate.pinned !== 'boolean') {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_INVALID',
      'Pinned state is required.',
    )
  }

  if (
    typeof candidate.worldCharacterId === 'string' &&
    candidate.worldCharacterId.length > 0
  ) {
    return {
      kind: 'CHARACTER',
      worldCharacterId: candidate.worldCharacterId,
      campaignId: optionalId(candidate.campaignId, 'Campaign ID'),
      pinned: candidate.pinned,
    }
  }

  if (
    typeof candidate.characterId === 'string' &&
    candidate.characterId.length > 0
  ) {
    return {
      kind: 'PORTABLE_CHARACTER',
      characterId: candidate.characterId,
      pinned: candidate.pinned,
    }
  }

  throw new EntryPreferenceDomainError(
    'ENTRY_PREFERENCE_INVALID',
    'A WorldCharacter or portable Character is required.',
  )
}
