'use client'

import Link from 'next/link'
import styles from './select.module.css'

export default function SelectError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.errorPage}>
      <section className={styles.handoff} role="alert">
        <h1>Unable to load your entry choices</h1>
        <p className={styles.muted}>
          Weaveryn could not load the Worlds, Campaigns, and Characters
          available to this account. You can retry without changing any data.
        </p>
        <div className={styles.errorActions}>
          <button
            className={`${styles.primaryLink} ${styles.errorButton}`}
            type="button"
            onClick={() => reset()}
          >
            Try again
          </button>
          <Link className={styles.secondaryLink} href="/select">
            Reload Choose Entity
          </Link>
        </div>
      </section>
    </main>
  )
}
