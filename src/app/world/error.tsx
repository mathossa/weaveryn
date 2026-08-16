'use client'

import styles from './world.module.css'

export default function WorldError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.panel} role="alert">
      <h1>Unable to load World information</h1>
      <p>The World view could not be loaded. You can retry without changing data.</p>
      <button className={styles.button} type="button" onClick={reset}>
        Retry
      </button>
    </main>
  )
}
