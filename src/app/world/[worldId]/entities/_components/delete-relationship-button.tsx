'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../entity.module.css'

export function DeleteRelationshipButton({
  worldId,
  relationshipId,
}: {
  worldId: string
  relationshipId: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setPending(true)
    setError(null)
    const response = await fetch(
      `/api/v1/worlds/${worldId}/relationships/${relationshipId}`,
      { method: 'DELETE' },
    )
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      setError(result?.error?.message ?? 'Could not remove relationship.')
      setPending(false)
      return
    }
    router.refresh()
  }

  return (
    <div className={styles.inlineAction}>
      <button
        className={styles.linkButton}
        disabled={pending}
        type="button"
        onClick={remove}
      >
        {pending ? 'Removing…' : 'Remove'}
      </button>
      {error ? <span className={styles.errorInline}>{error}</span> : null}
    </div>
  )
}
