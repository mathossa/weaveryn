'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './select-logout-button.module.css'

export function SelectLogoutButton() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(false)

  async function signOut() {
    if (signingOut) return

    setSigningOut(true)
    setSignOutError(false)

    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        setSignOutError(true)
        return
      }

      router.replace('/login')
      router.refresh()
    } catch {
      setSignOutError(true)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className={styles.logoutControl}>
      <button
        type="button"
        className={styles.logoutButton}
        data-error={signOutError ? 'true' : 'false'}
        disabled={signingOut}
        onClick={signOut}
        aria-label={signOutError ? 'Retry logging out' : 'Log out'}
        title={signOutError ? 'Unable to log out. Click to retry.' : 'Log out'}
      >
        <span className={styles.logoutIcon} aria-hidden="true">
          ↪
        </span>
        <span>
          {signingOut
            ? 'Logging out…'
            : signOutError
              ? 'Retry log out'
              : 'Log out'}
        </span>
      </button>
      <span className={styles.status} role="status" aria-live="polite">
        {signOutError ? 'Unable to log out right now. Please try again.' : ''}
      </span>
    </div>
  )
}
