'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import styles from '../campaign.module.css'

interface CampaignFormProps {
  mode: 'create' | 'edit'
  worldId: string
  campaignId?: string
  canEditName?: boolean
  initialName?: string
  initialDescription?: string | null
  initialWorldPosition?: string | null
  initialWorldDateLabel?: string | null
}

export function CampaignForm({
  mode,
  worldId,
  campaignId,
  canEditName = true,
  initialName = '',
  initialDescription = '',
  initialWorldPosition = '',
  initialWorldDateLabel = '',
}: CampaignFormProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const body = {
      ...(canEditName ? { name: String(form.get('name') ?? '') } : {}),
      description: String(form.get('description') ?? ''),
      currentWorldPosition: String(form.get('currentWorldPosition') ?? ''),
      currentWorldDateLabel: String(form.get('currentWorldDateLabel') ?? ''),
    }

    const url =
      mode === 'create'
        ? `/api/v1/worlds/${worldId}/campaigns`
        : `/api/v1/worlds/${worldId}/campaigns/${campaignId}`

    try {
      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error?.message ?? 'Campaign operation failed.')
        return
      }

      if (mode === 'create') {
        router.replace(`/world/${worldId}/campaign/${result.campaign.id}`)
        return
      }

      router.refresh()
    } catch {
      setError('Campaign operation failed. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {canEditName ? (
        <div className={styles.field}>
          <label htmlFor="campaign-name">Campaign name</label>
          <input
            id="campaign-name"
            name="name"
            required
            maxLength={120}
            defaultValue={initialName}
          />
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="campaign-description">Description</label>
        <textarea
          id="campaign-description"
          name="description"
          defaultValue={initialDescription ?? ''}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="campaign-date-label">World date label</label>
        <input
          id="campaign-date-label"
          name="currentWorldDateLabel"
          required
          defaultValue={initialWorldDateLabel ?? ''}
          placeholder="14 Emberwane, 812"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="campaign-position">Timeline position</label>
        <input
          id="campaign-position"
          name="currentWorldPosition"
          required
          inputMode="decimal"
          defaultValue={initialWorldPosition ?? ''}
          placeholder="142.5"
        />
      </div>

      <p className={styles.meta}>
        These two date fields are temporary. World calendar configuration will
        replace them in #69.
      </p>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.formActions}>
        <button className={styles.button} disabled={pending} type="submit">
          {pending
            ? 'Saving…'
            : mode === 'create'
              ? 'Create Campaign'
              : 'Save Campaign'}
        </button>
      </div>
    </form>
  )
}
