'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import {
  WORLD_CHARACTER_PROFILE_FIELDS,
  type WorldCharacterCustomFields,
  type WorldCharacterCustomFieldValue,
  type WorldCharacterProfile,
  type WorldCharacterProfileFieldKey,
} from '@/lib/world-character-profile'
import editorStyles from './character-profile-editor.module.css'
import styles from '../character.module.css'

type FieldKind = 'text' | 'number' | 'boolean'

interface EditableCustomField {
  id: string
  key: string
  kind: FieldKind
  value: string | boolean
}

function fieldKind(value: WorldCharacterCustomFieldValue): FieldKind {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'text'
}

function initialCustomFields(
  customFields: WorldCharacterCustomFields,
): EditableCustomField[] {
  return Object.entries(customFields).map(([key, value], index) => ({
    id: `${key}-${index}`,
    key,
    kind: fieldKind(value),
    value: typeof value === 'boolean' ? value : String(value),
  }))
}

function makeCustomField(): EditableCustomField {
  return {
    id: `detail-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    key: '',
    kind: 'text',
    value: '',
  }
}

export function CharacterProfileEditor({
  worldCharacterId,
  profile,
  customFields,
}: {
  worldCharacterId: string
  profile: WorldCharacterProfile
  customFields: WorldCharacterCustomFields
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hiddenFields, setHiddenFields] = useState<
    Set<WorldCharacterProfileFieldKey>
  >(new Set(profile.hiddenFields))
  const [details, setDetails] = useState<EditableCustomField[]>(
    initialCustomFields(customFields),
  )

  function updateDetail(id: string, patch: Partial<EditableCustomField>) {
    setDetails((current) =>
      current.map((detail) =>
        detail.id === id ? { ...detail, ...patch } : detail,
      ),
    )
  }

  function structuredCustomFields() {
    const result: WorldCharacterCustomFields = {}
    for (const detail of details) {
      const key = detail.key.trim()
      if (!key) continue
      if (detail.kind === 'boolean') result[key] = Boolean(detail.value)
      else if (detail.kind === 'number') result[key] = Number(detail.value)
      else result[key] = String(detail.value)
    }
    return result
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const values = Object.fromEntries(
      WORLD_CHARACTER_PROFILE_FIELDS.map((field) => [
        field.key,
        String(form.get(field.key) ?? ''),
      ]),
    )

    const response = await fetch(`/api/v1/world-characters/${worldCharacterId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        profile: { values, hiddenFields: [...hiddenFields] },
        customFields: structuredCustomFields(),
      }),
    })

    if (!response.ok) {
      const result = await response.json().catch(() => null)
      setError(result?.error?.message ?? 'Could not update Character profile.')
      setPending(false)
      return
    }

    setPending(false)
    router.refresh()
  }

  return (
    <form className={styles.profileEditor} onSubmit={submit}>
      <p className={styles.meta}>
        These are system-neutral World profile fields. They appear by default;
        hide anything that does not fit this Character.
      </p>
      <div className={styles.profileEditorGrid}>
        {WORLD_CHARACTER_PROFILE_FIELDS.map((field) => {
          const hidden = hiddenFields.has(field.key)
          return (
            <div className={styles.profileEditorField} key={field.key}>
              <div className={styles.profileEditorFieldHeading}>
                <label htmlFor={`profile-${field.key}`}>{field.label}</label>
                <label className={styles.profileVisibilityToggle}>
                  <input
                    type="checkbox"
                    checked={!hidden}
                    onChange={(event) => {
                      const next = new Set(hiddenFields)
                      if (event.target.checked) next.delete(field.key)
                      else next.add(field.key)
                      setHiddenFields(next)
                    }}
                  />
                  Show
                </label>
              </div>
              <textarea
                id={`profile-${field.key}`}
                name={field.key}
                rows={field.key === 'whoIs' ? 4 : 3}
                maxLength={2000}
                defaultValue={profile.values[field.key] ?? ''}
                placeholder="Not added yet"
              />
            </div>
          )
        })}
      </div>

      <div className={editorStyles.divider} />
      <div className={editorStyles.sectionHeading}>
        <div>
          <h4>Additional details</h4>
          <p className={styles.meta}>
            World-specific custom fields, including details added while this
            Character was an NPC.
          </p>
        </div>
        <button
          className={styles.secondary}
          type="button"
          onClick={() => setDetails((current) => [...current, makeCustomField()])}
        >
          Add field
        </button>
      </div>

      {details.length === 0 ? (
        <p className={styles.meta}>No additional details yet.</p>
      ) : (
        <div className={editorStyles.list}>
          {details.map((detail) => (
            <div className={editorStyles.row} key={detail.id}>
              <label className={styles.field}>
                <span>Name</span>
                <input
                  maxLength={80}
                  value={detail.key}
                  onChange={(event) =>
                    updateDetail(detail.id, { key: event.target.value })
                  }
                  placeholder="e.g. Former occupation"
                />
              </label>
              <label className={styles.field}>
                <span>Type</span>
                <select
                  value={detail.kind}
                  onChange={(event) => {
                    const kind = event.target.value as FieldKind
                    updateDetail(detail.id, {
                      kind,
                      value: kind === 'boolean' ? false : '',
                    })
                  }}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Yes / No</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Value</span>
                {detail.kind === 'boolean' ? (
                  <select
                    value={detail.value ? 'true' : 'false'}
                    onChange={(event) =>
                      updateDetail(detail.id, {
                        value: event.target.value === 'true',
                      })
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type={detail.kind === 'number' ? 'number' : 'text'}
                    maxLength={detail.kind === 'text' ? 2000 : undefined}
                    value={String(detail.value)}
                    onChange={(event) =>
                      updateDetail(detail.id, { value: event.target.value })
                    }
                  />
                )}
              </label>
              <button
                className={styles.secondary}
                type="button"
                onClick={() =>
                  setDetails((current) =>
                    current.filter((item) => item.id !== detail.id),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions}>
        <button className={styles.button} disabled={pending} type="submit">
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}
