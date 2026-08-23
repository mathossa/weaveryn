'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../../campaign.module.css'

export function CampaignContextControls({
  endpoint,
  locations,
  currentLocationId,
  currentFocus,
  canUpdateFocus,
}: {
  endpoint: string
  locations: Array<{ id: string; name: string }>
  currentLocationId: string | null
  currentFocus: string | null
  canUpdateFocus: boolean
}) {
  const router = useRouter()
  const [locationId, setLocationId] = useState(currentLocationId ?? '')
  const [focus, setFocus] = useState(currentFocus ?? '')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFeedback(null)
    setFailed(false)
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentLocationId: locationId || null,
          ...(canUpdateFocus ? { currentFocus: focus || null } : {}),
        }),
      })
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string }
      } | null
      if (!response.ok) {
        setFailed(true)
        setFeedback(
          body?.error?.message ?? 'Campaign context could not be updated.',
        )
        return
      }
      setFeedback('Campaign context updated.')
      router.refresh()
    } catch {
      setFailed(true)
      setFeedback('Campaign context could not be updated.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className={styles.contextForm} onSubmit={submit}>
      <label>
        <span>Current Location</span>
        <select
          value={locationId}
          disabled={pending}
          onChange={(event) => setLocationId(event.target.value)}
        >
          <option value="">No Current Location</option>
          {locations.map((location) => (
            <option value={location.id} key={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </label>
      {canUpdateFocus ? (
        <label>
          <span>What&apos;s Next?</span>
          <textarea
            rows={2}
            maxLength={280}
            value={focus}
            disabled={pending}
            placeholder="Short player-visible Campaign focus"
            onChange={(event) => setFocus(event.target.value)}
          />
        </label>
      ) : null}
      <div className={styles.contextFormFooter}>
        <button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Update context'}
        </button>
        {feedback ? (
          <span className={failed ? styles.inlineError : styles.inlineSuccess}>
            {feedback}
          </span>
        ) : null}
      </div>
    </form>
  )
}
