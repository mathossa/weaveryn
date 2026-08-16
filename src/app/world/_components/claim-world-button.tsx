'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../world.module.css'

export function ClaimWorldButton({ worldId }: { worldId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function claim() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/v1/worlds/${worldId}/claim`, {
        method: 'POST',
      })
      const payload = (await response.json()) as {
        error?: { message?: string }
      }
      if (!response.ok) {
        throw new Error(payload.error?.message ?? 'World could not be claimed.')
      }
      router.refresh()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'World could not be claimed.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.stack}>
      <button
        className={styles.button}
        type="button"
        onClick={claim}
        disabled={pending}
      >
        {pending ? 'Claiming…' : 'Claim World ownership'}
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
