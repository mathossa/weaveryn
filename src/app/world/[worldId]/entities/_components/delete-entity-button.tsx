'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { withCharacterContext } from '@/lib/campaign-context'
import styles from '../entity.module.css'

export function DeleteEntityButton({
  worldId,
  entityId,
  entityName,
  contextCampaignId,
  contextWorldCharacterId,
}: {
  worldId: string
  entityId: string
  entityName: string
  contextCampaignId?: string
  contextWorldCharacterId?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    const confirmed = window.confirm(
      `Delete "${entityName}"? Relationships involving this entity will also be removed. Other linked entities will not be deleted.`,
    )
    if (!confirmed) return

    setPending(true)
    setError(null)
    const response = await fetch(
      `/api/v1/worlds/${worldId}/entities/${entityId}`,
      { method: 'DELETE' },
    )
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      setError(result?.error?.message ?? 'Could not delete World entity.')
      setPending(false)
      return
    }

    const query = contextCampaignId ? `?campaign=${contextCampaignId}` : ''
    router.replace(
      withCharacterContext(
        `/world/${worldId}/entities${query}`,
        contextWorldCharacterId,
      ),
    )
    router.refresh()
  }

  return (
    <div className={styles.deleteBlock}>
      <button
        className={styles.dangerButton}
        disabled={pending}
        type="button"
        onClick={remove}
      >
        {pending ? 'Deleting…' : 'Delete entity'}
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  )
}
