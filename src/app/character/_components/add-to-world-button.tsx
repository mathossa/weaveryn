'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../character.module.css'

export function AddToWorldButton({
  characterId,
  worldId,
  worldName,
  campaignId,
}: {
  characterId: string
  worldId: string
  worldName: string
  campaignId?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    setPending(true)
    setError(null)
    const response = await fetch(
      `/api/v1/characters/${characterId}/world-characters`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ worldId }),
      },
    )
    const result = await response.json()
    if (!response.ok) {
      setError(result.error?.message ?? 'Could not add Character to World.')
      setPending(false)
      return
    }

    const query = campaignId ? `?campaign=${campaignId}` : ''
    router.replace(`/character/${result.worldCharacter.id}${query}`)
  }

  return (
    <div>
      <button className={styles.button} type="button" disabled={pending} onClick={add}>
        {pending ? 'Adding…' : `Add to ${worldName}`}
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  )
}
