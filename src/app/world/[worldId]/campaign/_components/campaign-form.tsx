'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import styles from '../campaign.module.css'

interface CampaignFormProps {
  mode: 'create' | 'edit'
  worldId: string
  section?: 'all' | 'details' | 'time'
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
  section = 'all',
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
  const showsDetails = section !== 'time'
  const showsTime = section !== 'details'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const body = {
      ...(showsDetails && canEditName
        ? { name: String(form.get('name') ?? '') }
        : {}),
      ...(showsDetails
        ? { description: String(form.get('description') ?? '') }
        : {}),
      ...(showsTime
        ? {
            currentWorldPosition: String(
              form.get('currentWorldPosition') ?? '',
            ),
            currentWorldDateLabel: String(
              form.get('currentWorldDateLabel') ?? '',
            ),
          }
        : {}),
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
      setError(
        'Campaign operation failed. Check your connection and try again.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {showsDetails && canEditName ? (
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

      {showsDetails ? (
        <div className={styles.field}>
          <label htmlFor="campaign-description">Description</label>
          <textarea
            id="campaign-description"
            name="description"
            defaultValue={initialDescription ?? ''}
          />
        </div>
      ) : null}

      {showsTime ? (
        <>
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
        </>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.formActions}>
        <button className={styles.button} disabled={pending} type="submit">
          {pending
            ? 'Saving…'
            : mode === 'create'
              ? 'Create Campaign'
              : section === 'details'
                ? 'Save details'
                : section === 'time'
                  ? 'Save World time'
                  : 'Save Campaign'}
        </button>
      </div>
    </form>
  )
}
