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

export type WorldCharacterCustomFieldValue = string | number | boolean
export type WorldCharacterCustomFields = Record<
  string,
  WorldCharacterCustomFieldValue
>

export interface WorldCharacterProfile {
  values: Partial<Record<WorldCharacterProfileFieldKey, string>>
  hiddenFields: WorldCharacterProfileFieldKey[]
}

const PROFILE_KEYS = new Set<WorldCharacterProfileFieldKey>(
  WORLD_CHARACTER_PROFILE_FIELDS.map((field) => field.key),
)
const PROFILE_FIELDS_BY_LABEL = new Map(
  WORLD_CHARACTER_PROFILE_FIELDS.map((field) => [field.label, field] as const),
)

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function customFieldValue(value: unknown): WorldCharacterCustomFieldValue | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'boolean') return value
  return null
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

export function normalizeWorldCharacterCustomFields(
  value: unknown,
): WorldCharacterCustomFields {
  const container = record(value)
  const fields = record(container?.customFields)
  if (!fields) return {}

  const normalized: WorldCharacterCustomFields = {}
  for (const [key, value] of Object.entries(fields)) {
    const normalizedKey = key.trim()
    const normalizedValue = customFieldValue(value)
    if (!normalizedKey || normalizedValue === null) continue
    normalized[normalizedKey] = normalizedValue
  }
  return normalized
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

export function mergeWorldCharacterCustomFields(
  worldData: unknown,
  customFields: WorldCharacterCustomFields,
) {
  const current = record(worldData) ?? {}
  return {
    ...current,
    customFields,
  }
}

export function adoptWorldEntityIntoWorldCharacterData(
  worldData: unknown,
  description: string | null,
  entityData: unknown,
) {
  const current = record(worldData) ?? {}
  const currentProfile = normalizeWorldCharacterProfile(worldData)
  const currentCustomFields = normalizeWorldCharacterCustomFields(worldData)
  const entityRecord = record(entityData) ?? {}
  const importedProfileValues: WorldCharacterProfile['values'] = {}
  const importedCustomFields: WorldCharacterCustomFields = {}

  for (const [key, value] of Object.entries(entityRecord)) {
    const profileField = PROFILE_FIELDS_BY_LABEL.get(key)
    if (profileField) {
      const text = customFieldValue(value)
      if (text !== null && String(text).trim()) {
        importedProfileValues[profileField.key] = String(text).trim()
      }
      continue
    }

    const normalizedValue = customFieldValue(value)
    if (normalizedValue !== null) {
      importedCustomFields[key] = normalizedValue
    }
  }

  const npcDescription = description?.trim()
  if (npcDescription) importedProfileValues.whoIs = npcDescription

  return {
    ...current,
    profile: {
      values: {
        ...importedProfileValues,
        ...currentProfile.values,
      },
      hiddenFields: currentProfile.hiddenFields,
    },
    customFields: {
      ...importedCustomFields,
      ...currentCustomFields,
    },
  }
}

export function visibleWorldCharacterProfileFields(
  profile: WorldCharacterProfile,
) {
  const hidden = new Set(profile.hiddenFields)
  return WORLD_CHARACTER_PROFILE_FIELDS.filter((field) => !hidden.has(field.key))
}
