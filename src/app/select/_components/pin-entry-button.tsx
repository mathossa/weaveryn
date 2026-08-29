'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../select.module.css'

type PinEntryTarget =
  | {
      worldCharacterId: string
      campaignId?: string | null
      characterId?: never
    }
  | {
      characterId: string
      worldCharacterId?: never
      campaignId?: never
    }

export function PinEntryButton({
  pinned,
  className,
  ...target
}: PinEntryTarget & { pinned: boolean; className?: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [isPinned, setIsPinned] = useState(pinned)

  async function togglePin() {
    if (saving) return
    const nextPinned = !isPinned
    setSaving(true)
    setIsPinned(nextPinned)

    try {
      const body =
        'characterId' in target
          ? {
              characterId: target.characterId,
              pinned: nextPinned,
            }
          : {
              worldCharacterId: target.worldCharacterId,
              campaignId: target.campaignId ?? null,
              pinned: nextPinned,
            }
      const response = await fetch('/api/v1/selection/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
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
      className={`${styles.pinButton} ${className ?? ''}`}
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
