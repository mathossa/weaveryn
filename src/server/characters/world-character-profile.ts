export const WORLD_CHARACTER_PROFILE_FIELDS = [
  { key: 'whoIs', label: 'Who are they?' },
  { key: 'home', label: 'Where are they from?' },
  { key: 'personality', label: 'Personality' },
  { key: 'goals', label: 'Goals' },
  { key: 'ideals', label: 'Ideals' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'flaws', label: 'Flaws & fears' },
  { key: 'affiliations', label: 'Affiliations' },
] as const

export type WorldCharacterProfileFieldKey =
  (typeof WORLD_CHARACTER_PROFILE_FIELDS)[number]['key']

export interface WorldCharacterProfile {
  values: Partial<Record<WorldCharacterProfileFieldKey, string>>
  hiddenFields: WorldCharacterProfileFieldKey[]
}

const PROFILE_KEYS = new Set<WorldCharacterProfileFieldKey>(
  WORLD_CHARACTER_PROFILE_FIELDS.map((field) => field.key),
)

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function normalizeWorldCharacterProfile(
  value: unknown,
): WorldCharacterProfile {
  const container = record(value)
  const profile = record(container?.profile)
  const valuesSource = record(profile?.values)
  const values: WorldCharacterProfile['values'] = {}

  for (const field of WORLD_CHARACTER_PROFILE_FIELDS) {
    const fieldValue = valuesSource?.[field.key]
    if (typeof fieldValue === 'string' && fieldValue.trim()) {
      values[field.key] = fieldValue.trim()
    }
  }

  const hiddenFields = Array.isArray(profile?.hiddenFields)
    ? profile.hiddenFields.filter(
        (key): key is WorldCharacterProfileFieldKey =>
          typeof key === 'string' &&
          PROFILE_KEYS.has(key as WorldCharacterProfileFieldKey),
      )
    : []

  return { values, hiddenFields: [...new Set(hiddenFields)] }
}

export function mergeWorldCharacterProfile(
  worldData: unknown,
  profile: WorldCharacterProfile,
) {
  const current = record(worldData) ?? {}
  return {
    ...current,
    profile: {
      values: profile.values,
      hiddenFields: profile.hiddenFields,
    },
  }
}

export function visibleWorldCharacterProfileFields(
  profile: WorldCharacterProfile,
) {
  const hidden = new Set(profile.hiddenFields)
  return WORLD_CHARACTER_PROFILE_FIELDS.filter((field) => !hidden.has(field.key))
}
