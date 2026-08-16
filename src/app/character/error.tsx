'use client'

import Link from 'next/link'
import styles from './character.module.css'

export default function CharacterError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.errorPage}>
      <section className={styles.panel} role="alert">
        <h1>We could not load this Character</h1>
        <p>
          The Character context could not be loaded. Retry the request or return
          to your Character list.
        </p>
        <div className={styles.actions}>
          <button className={styles.button} type="button" onClick={reset}>
            Try again
          </button>
          <Link className={styles.secondary} href="/character">
            Back to Characters
          </Link>
        </div>
      </section>
    </main>
  )
}
