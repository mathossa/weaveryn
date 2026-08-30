'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { uiAssets } from '@/lib/ui-assets'
import styles from './weaver-favorite-button.module.css'

interface WeaverFavoriteButtonProps {
  worldId: string
  campaignId?: string | null
  pinned: boolean
  label: 'World' | 'Campaign'
}

export function WeaverFavoriteButton({
  worldId,
  campaignId,
  pinned,
  label,
}: WeaverFavoriteButtonProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [isPinned, setIsPinned] = useState(pinned)

  async function toggleFavorite() {
    if (saving) return

    const nextPinned = !isPinned
    setSaving(true)
    setIsPinned(nextPinned)

    try {
      const response = await fetch('/api/v1/selection/weaver-preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          worldId,
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

  const action = isPinned ? 'Remove from favorites' : 'Add to favorites'

  return (
    <button
      type="button"
      className={styles.favoriteButton}
      aria-pressed={isPinned}
      aria-label={`${action}: ${label}`}
      title={action}
      disabled={saving}
      onClick={toggleFavorite}
    >
      <Image
        src={
          isPinned
            ? uiAssets.ui.icons.favoriteSelected
            : uiAssets.ui.icons.favoriteUnselected
        }
        alt=""
        width={28}
        height={28}
        aria-hidden="true"
      />
    </button>
  )
}
