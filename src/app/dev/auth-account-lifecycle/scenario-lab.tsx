'use client'

import { useState } from 'react'
import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  AuthAccountLifecycleAction,
  AuthAccountLifecycleState,
} from '@/dev/scenarios/auth-account-lifecycle'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'
import styles from './scenario-lab.module.css'

const metadata = requireDevScenarioMetadata('auth-account-lifecycle')
const email = 'dev-auth-account-lifecycle@weaveryn.local'
const displayName = 'Auth Lifecycle Tester'

interface SafeAuthStatus {
  authenticated: boolean
  userId: string | null
  email: string | null
}

async function safeError(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    message?: string
    error?: { message?: string; code?: string }
  } | null
  return (
    data?.error?.message ??
    data?.message ??
    `Request failed (${response.status}).`
  )
}

export function AuthAccountLifecycleLab() {
  const { result, isBusy, perform, reload } = useDevScenario<
    AuthAccountLifecycleState,
    AuthAccountLifecycleAction
  >(metadata.id)
  const [password, setPassword] = useState('')
  const [authStatus, setAuthStatus] = useState<SafeAuthStatus>({
    authenticated: false,
    userId: null,
    email: null,
  })
  const [message, setMessage] = useState(
    'Use a temporary password of at least 8 characters. It is never displayed in scenario output.',
  )
  const [preflight, setPreflight] = useState<unknown>(null)
  const [authBusy, setAuthBusy] = useState(false)

  async function checkSession() {
    const response = await fetch('/api/auth/get-session', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
    const data = response.ok
      ? ((await response.json()) as {
          user?: { id?: string; email?: string }
        })
      : null
    const safe = {
      authenticated: Boolean(data?.user?.id),
      userId: data?.user?.id ?? null,
      email: data?.user?.email ?? null,
    }
    setAuthStatus(safe)
    return safe
  }

  async function authRequest(
    path: string,
    body: Record<string, unknown>,
    successMessage: string,
  ) {
    if (password.length < 8) {
      setMessage('Enter a temporary password of at least 8 characters first.')
      return
    }
    setAuthBusy(true)
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(await safeError(response))
      setMessage(successMessage)
      await checkSession()
      await reload()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Authentication request failed.',
      )
    } finally {
      setAuthBusy(false)
    }
  }

  async function inspectPreflight() {
    setAuthBusy(true)
    try {
      const response = await fetch('/api/account', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (!response.ok) throw new Error(await safeError(response))
      const data = (await response.json()) as { preflight: unknown }
      setPreflight(data.preflight)
      setMessage('Loaded the Weaveryn account-deletion preflight.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Preflight failed.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function deleteAccount() {
    setAuthBusy(true)
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!response.ok) throw new Error(await safeError(response))
      const data = (await response.json()) as { orphanedWorldIds?: string[] }
      setMessage(
        `Account deleted. Orphaned Worlds: ${data.orphanedWorldIds?.length ?? 0}.`,
      )
      setPreflight(null)
      await checkSession()
      await reload()
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Account deletion failed.',
      )
      await inspectPreflight().catch(() => undefined)
    } finally {
      setAuthBusy(false)
    }
  }

  const busy = isBusy || authBusy

  return (
    <main className="dev-page">
      <ScenarioNavigation issueNumbers={metadata.issueNumbers} />
      <header>
        <span>Development only · Issue #14</span>
        <h1>Better Auth account lifecycle</h1>
        <p>
          This browser flow uses the real Better Auth endpoints and real cookie
          session. Scenario output intentionally excludes credentials, hashes,
          and session tokens.
        </p>
      </header>

      <ScenarioLifecycleControls
        isBusy={busy}
        hasFixture={Boolean(result?.state?.user)}
        resetLabel="Reset auth scenario"
        onAction={(action) => void perform({ action })}
      />

      <section>
        <h2>Temporary development credential</h2>
        <p>
          Account email: <code>{email}</code>
        </p>
        <label className={styles.credentialField}>
          Temporary password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <div className={styles.buttonGroup}>
          <button
            className={styles.button}
            type="button"
            disabled={busy}
            onClick={() =>
              void authRequest(
                '/api/auth/sign-up/email',
                { name: displayName, email, password },
                'Account created through Better Auth. Sign in next.',
              )
            }
          >
            Register account
          </button>
          <button
            className={styles.button}
            type="button"
            disabled={busy}
            onClick={() =>
              void authRequest(
                '/api/auth/sign-in/email',
                { email, password },
                'Authenticated through Better Auth.',
              )
            }
          >
            Sign in
          </button>
          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            type="button"
            disabled={busy}
            onClick={() => void checkSession()}
          >
            Check session
          </button>
          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            type="button"
            disabled={busy}
            onClick={async () => {
              setAuthBusy(true)
              try {
                const response = await fetch('/api/auth/sign-out', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  credentials: 'same-origin',
                  body: '{}',
                })
                if (!response.ok) throw new Error(await safeError(response))
                setMessage('Logged out through Better Auth.')
                await checkSession()
                await reload()
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : 'Logout failed.',
                )
              } finally {
                setAuthBusy(false)
              }
            }}
          >
            Sign out
          </button>
        </div>
        <p>{message}</p>
        <p>
          Authenticated:{' '}
          <strong>{authStatus.authenticated ? 'yes' : 'no'}</strong>
          {authStatus.userId ? (
            <>
              {' '}
              · User <code>{authStatus.userId}</code> · {authStatus.email}
            </>
          ) : null}
        </p>
      </section>

      <section>
        <h2>Deletion lifecycle</h2>
        <p>
          Seed an owned World to verify orphaning. Seed a Character to verify
          deletion is blocked until owned content is explicitly resolved.
        </p>
        <div className={styles.buttonGroup}>
          <button
            className={styles.button}
            type="button"
            disabled={busy || !result?.state?.user}
            onClick={() => void perform({ action: 'seed-world' })}
          >
            Seed owned World
          </button>
          <button
            className={styles.button}
            type="button"
            disabled={busy || !result?.state?.user}
            onClick={() => void perform({ action: 'seed-character' })}
          >
            Seed Character blocker
          </button>
          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            type="button"
            disabled={busy || !result?.state?.ownedCharacter}
            onClick={() => void perform({ action: 'resolve-character' })}
          >
            Resolve Character blocker
          </button>
          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            type="button"
            disabled={busy}
            onClick={() => void inspectPreflight()}
          >
            Inspect deletion preflight
          </button>
          <button
            className={`${styles.button} ${styles.dangerButton}`}
            type="button"
            disabled={busy}
            onClick={() => void deleteAccount()}
          >
            Delete authenticated account
          </button>
        </div>
        {preflight ? (
          <pre className={styles.preflight}>
            {JSON.stringify(preflight, null, 2)}
          </pre>
        ) : null}
      </section>

      <ScenarioResultPanels result={result} />
    </main>
  )
}
