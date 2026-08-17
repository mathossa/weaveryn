'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import styles from '../character.module.css'

interface CharacterFormProps {
  mode: 'create' | 'edit'
  characterId?: string
  initialName?: string
  targetWorldId?: string
  targetCampaignId?: string
}

function targetQuery(worldId?: string, campaignId?: string) {
  const query = new URLSearchParams()
  if (worldId) query.set('world', worldId)
  if (campaignId) query.set('campaign', campaignId)
  const value = query.toString()
  return value ? `?${value}` : ''
}

export function CharacterForm({
  mode,
  characterId,
  initialName = '',
  targetWorldId,
  targetCampaignId,
}: CharacterFormProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const response = await fetch(
      mode === 'create'
        ? '/api/v1/characters'
        : `/api/v1/characters/${characterId}`,
      {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: String(form.get('name') ?? '') }),
      },
    )
    const result = await response.json()

    if (!response.ok) {
      setError(result.error?.message ?? 'Character operation failed.')
      setPending(false)
      return
    }

    if (mode === 'create') {
      router.replace(
        `/character/portable/${result.character.id}${targetQuery(targetWorldId, targetCampaignId)}`,
      )
      return
    }

    router.refresh()
    setPending(false)
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.field}>
        <label htmlFor={`character-name-${mode}`}>Character name</label>
        <input
          id={`character-name-${mode}`}
          name="name"
          required
          maxLength={120}
          defaultValue={initialName}
        />
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions}>
        <button className={styles.button} disabled={pending} type="submit">
          {pending
            ? 'Saving…'
            : mode === 'create'
              ? 'Create Character'
              : 'Save portable identity'}
        </button>
      </div>
    </form>
  )
}
