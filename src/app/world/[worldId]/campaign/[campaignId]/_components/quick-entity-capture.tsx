'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../../campaign.module.css'

export function QuickEntityCapture({
  worldId,
  campaignId,
}: {
  worldId: string
  campaignId: string
}) {
  const router = useRouter()
  const [type, setType] = useState<'person' | 'location'>('person')
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = name.trim()
    if (!normalizedName) return
    setPending(true)
    setFeedback(null)
    setFailed(false)
    try {
      const response = await fetch(`/api/v1/worlds/${worldId}/entities`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          type,
          name: normalizedName,
          data: {},
          contextCampaignId: campaignId,
          visibility: { scope: 'CAMPAIGN', campaignId },
        }),
      })
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string }
      } | null
      if (!response.ok) {
        setFailed(true)
        setFeedback(body?.error?.message ?? 'Could not capture this entry.')
        return
      }
      setName('')
      setFeedback(`${type === 'person' ? 'Person' : 'Place'} captured.`)
      router.refresh()
    } catch {
      setFailed(true)
      setFeedback('Could not capture this entry.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className={styles.quickCapture} onSubmit={submit}>
      <div className={styles.captureTypes} aria-label="Entry type">
        <button
          type="button"
          aria-pressed={type === 'person'}
          onClick={() => setType('person')}
        >
          + Person
        </button>
        <button
          type="button"
          aria-pressed={type === 'location'}
          onClick={() => setType('location')}
        >
          + Place
        </button>
      </div>
      <label>
        <span>Name</span>
        <input
          required
          maxLength={120}
          value={name}
          disabled={pending}
          placeholder={type === 'person' ? 'Mara' : 'The eastern gate'}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <button className={styles.captureSave} type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </button>
      {feedback ? (
        <span className={failed ? styles.inlineError : styles.inlineSuccess}>
          {feedback}
        </span>
      ) : null}
    </form>
  )
}
