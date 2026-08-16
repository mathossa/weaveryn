'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../character.module.css'

export function AttachCampaignButton({
  worldCharacterId,
  worldId,
  campaignId,
  campaignName,
}: {
  worldCharacterId: string
  worldId: string
  campaignId: string
  campaignName: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function attach() {
    setPending(true)
    setError(null)
    const response = await fetch(
      `/api/v1/world-characters/${worldCharacterId}/campaign-characters`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      },
    )
    const result = await response.json()
    if (!response.ok) {
      setError(result.error?.message ?? 'Could not join Campaign with this Character.')
      setPending(false)
      return
    }

    router.replace(
      `/world/${worldId}/campaign/${campaignId}?character=${worldCharacterId}`,
    )
  }

  return (
    <div>
      <button
        className={styles.button}
        type="button"
        disabled={pending}
        onClick={attach}
      >
        {pending ? 'Joining…' : `Join ${campaignName}`}
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  )
}
