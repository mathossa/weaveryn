'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../world.module.css'

interface WorldFormProps {
  mode: 'create' | 'edit'
  worldId?: string
  initialName?: string
  initialDescription?: string | null
}

export function WorldForm({
  mode,
  worldId,
  initialName = '',
  initialDescription = '',
}: WorldFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      const response = await fetch(
        mode === 'create' ? '/api/v1/worlds' : `/api/v1/worlds/${worldId}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, description }),
        },
      )
      const payload = (await response.json()) as {
        world?: { id: string }
        error?: { message?: string }
      }
      if (!response.ok || !payload.world) {
        throw new Error(payload.error?.message ?? 'World could not be saved.')
      }

      router.push(`/world/${payload.world.id}`)
      router.refresh()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'World could not be saved.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.field}>
        <label htmlFor="world-name">World name</label>
        <input
          id="world-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="world-description">Description</label>
        <textarea
          id="world-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={4000}
        />
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.formActions}>
        <button className={styles.button} type="submit" disabled={pending}>
          {pending
            ? 'Saving…'
            : mode === 'create'
              ? 'Create World'
              : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
