'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../character.module.css'

async function errorMessage(response: Response, fallback: string) {
  try {
    const result = (await response.json()) as {
      error?: { message?: string }
    }
    return result.error?.message ?? fallback
  } catch {
    return fallback
  }
}

export function LeaveCampaignAction({
  campaignCharacterId,
  campaignName,
}: {
  campaignCharacterId: string
  campaignName: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function leaveCampaign() {
    setPending(true)
    setError(null)

    const response = await fetch(
      `/api/v1/campaign-characters/${campaignCharacterId}`,
      { method: 'DELETE' },
    )
    if (!response.ok) {
      setError(await errorMessage(response, 'Could not leave this Campaign.'))
      setPending(false)
      return
    }

    setConfirming(false)
    setPending(false)
    router.refresh()
  }

  if (!confirming) {
    return (
      <div className={styles.lifecycleAction}>
        <button
          className={styles.dangerSecondary}
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null)
            setConfirming(true)
          }}
        >
          Leave Campaign
        </button>
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    )
  }

  return (
    <div
      className={styles.dangerConfirm}
      role="group"
      aria-label="Leave Campaign confirmation"
    >
      <strong>Leave {campaignName}?</strong>
      <p>
        This removes this Character&apos;s Campaign participation only. Your
        Campaign membership, WorldCharacter, portable Character, and World
        relationships remain.
      </p>
      <div className={styles.actions}>
        <button
          className={styles.secondary}
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
        <button
          className={styles.dangerButton}
          type="button"
          disabled={pending}
          onClick={() => void leaveCampaign()}
        >
          {pending ? 'Leaving…' : 'Confirm leave Campaign'}
        </button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  )
}

export function LeaveWorldAction({
  worldCharacterId,
  portableCharacterId,
  worldName,
  hasCampaignParticipation,
}: {
  worldCharacterId: string
  portableCharacterId: string
  worldName: string
  hasCampaignParticipation: boolean
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function leaveWorld() {
    setPending(true)
    setError(null)

    const response = await fetch(`/api/v1/world-characters/${worldCharacterId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      setError(
        await errorMessage(
          response,
          'Could not remove this Character from the World.',
        ),
      )
      setPending(false)
      return
    }

    router.replace(`/character/portable/${portableCharacterId}`)
  }

  if (hasCampaignParticipation) {
    return (
      <div className={styles.lifecycleAction}>
        <button
          className={styles.dangerSecondary}
          type="button"
          disabled
          title="Campaign participation must be resolved first."
        >
          Leave World
        </button>
        <p className={styles.meta}>
          This WorldCharacter still participates in a Campaign. Leave the
          Campaigns you can access first; a Campaign manager may need to resolve
          any participation you can no longer access before you can leave{' '}
          {worldName}.
        </p>
      </div>
    )
  }

  if (!confirming) {
    return (
      <div className={styles.lifecycleAction}>
        <button
          className={styles.dangerSecondary}
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null)
            setConfirming(true)
          }}
        >
          Leave World
        </button>
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    )
  }

  return (
    <div
      className={styles.dangerConfirm}
      role="group"
      aria-label="Leave World confirmation"
    >
      <strong>Remove this Character from {worldName}?</strong>
      <p>
        Your portable Character remains yours. The WorldCharacter is removed,
        while its current World entity becomes an independent Person / NPC
        snapshot and keeps its existing World relationships.
      </p>
      <div className={styles.actions}>
        <button
          className={styles.secondary}
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
        <button
          className={styles.dangerButton}
          type="button"
          disabled={pending}
          onClick={() => void leaveWorld()}
        >
          {pending ? 'Removing…' : 'Confirm leave World'}
        </button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  )
}
