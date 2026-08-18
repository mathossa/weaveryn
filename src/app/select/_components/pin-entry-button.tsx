'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../select.module.css'

export function PinEntryButton({
  worldCharacterId,
  campaignId,
  pinned,
}: {
  worldCharacterId: string
  campaignId?: string | null
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
      const response = await fetch('/api/v1/selection/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          worldCharacterId,
          campaignId: campaignId ?? null,
          pinned: nextPinned,
        }),
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
      className={styles.pinButton}
      type="button"
      aria-pressed={isPinned}
      aria-label={isPinned ? 'Unpin entry' : 'Pin entry'}
      title={isPinned ? 'Unpin entry' : 'Pin entry'}
      disabled={saving}
      onClick={togglePin}
    >
      <span aria-hidden="true">{isPinned ? '★' : '☆'}</span>
    </button>
  )
}
