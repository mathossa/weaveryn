'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import styles from './timeline-error.module.css'

export default function WorldTimelineError({
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
    <main className={styles.page}>
      <section className={styles.panel}>
        <span>World history</span>
        <h1>The timeline could not be opened</h1>
        <p>
          The history may be unavailable to your World role, or an unexpected
          error occurred while loading it.
        </p>
        <div className={styles.actions}>
          <button className={styles.primary} type="button" onClick={reset}>
            Try again
          </button>
          <Link className={styles.secondary} href="/world">
            Choose a World
          </Link>
        </div>
      </section>
    </main>
  )
}
