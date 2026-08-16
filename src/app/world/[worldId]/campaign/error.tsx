'use client'

import { useEffect } from 'react'
import styles from './campaign.module.css'

export default function CampaignError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className={styles.panel} role="alert">
      <h1>Unable to load Campaign</h1>
      <p>
        The Campaign context could not be loaded. You can retry without changing
        data.
      </p>
      <button className={styles.button} type="button" onClick={reset}>
        Retry
      </button>
    </main>
  )
}
