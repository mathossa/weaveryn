'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../world.module.css'

export function WorldCampaignPinButton({
  worldId,
  campaignId,
  pinned,
}: {
  worldId: string
  campaignId: string
  pinned: boolean
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [isPinned, setIsPinned] = useState(pinned)

  async function togglePin() {
    if (saving) return
    const nextPinned = !isPinned
    setSaving(true)
    setIsPinned(nextPinned)

    try {
      const response = await fetch('/api/v1/selection/weaver-preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ worldId, campaignId, pinned: nextPinned }),
      })

      if (!response.ok) {
        setIsPinned(!nextPinned)
        return
      }

      router.refresh()
    } catch {
      setIsPinned(!nextPinned)
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      className={styles.campaignPin}
      type="button"
      aria-pressed={isPinned}
      aria-label={isPinned ? 'Unpin campaign' : 'Pin campaign'}
      title={isPinned ? 'Unpin campaign' : 'Pin campaign'}
      disabled={saving}
      onClick={togglePin}
    >
      <span aria-hidden="true">{isPinned ? '★' : '☆'}</span>
    </button>
  )
}
