'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import styles from '../character.module.css'

export function WorldCharacterForm({
  worldCharacterId,
  initialNameOverride,
}: {
  worldCharacterId: string
  initialNameOverride: string | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const response = await fetch(`/api/v1/world-characters/${worldCharacterId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nameOverride: String(form.get('nameOverride') ?? ''),
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error?.message ?? 'Could not update World identity.')
      setPending(false)
      return
    }
    router.refresh()
    setPending(false)
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.field}>
        <label htmlFor="world-character-name">World-specific name</label>
        <input
          id="world-character-name"
          name="nameOverride"
          maxLength={120}
          defaultValue={initialNameOverride ?? ''}
          placeholder="Leave empty to use the portable Character name"
        />
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions}>
        <button className={styles.button} disabled={pending} type="submit">
          {pending ? 'Saving…' : 'Save World identity'}
        </button>
      </div>
    </form>
  )
}
