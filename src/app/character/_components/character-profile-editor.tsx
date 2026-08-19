'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import {
  WORLD_CHARACTER_PROFILE_FIELDS,
  type WorldCharacterProfile,
  type WorldCharacterProfileFieldKey,
} from '@/lib/world-character-profile'
import styles from '../character.module.css'

export function CharacterProfileEditor({
  worldCharacterId,
  profile,
}: {
  worldCharacterId: string
  profile: WorldCharacterProfile
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hiddenFields, setHiddenFields] = useState<
    Set<WorldCharacterProfileFieldKey>
  >(new Set(profile.hiddenFields))

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
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions}>
        <button className={styles.button} disabled={pending} type="submit">
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}
