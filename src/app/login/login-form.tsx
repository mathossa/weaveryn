'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/ui/brand-logo'
import { Button } from '@/components/ui/button'
import { HintPopover } from '@/components/ui/hint-popover'
import {
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_USERNAME_MAX_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
  normalizeUsername,
  usernameValidationMessage,
} from '@/lib/auth-policy'
import styles from './login-form.module.css'

type AuthMode = 'sign-in' | 'register'
type Feedback = { tone: 'error' | 'success'; message: string } | null

function failureMessage(mode: AuthMode, status: number) {
  if (mode === 'sign-in' && (status === 400 || status === 401)) {
    return 'Email or password is incorrect.'
  }

  if (mode === 'register' && status >= 400 && status < 500) {
    return 'Unable to create this account. Check the details and try again, or sign in if you already have an account.'
  }

  return mode === 'sign-in'
    ? 'Unable to sign in right now. Please try again.'
    : 'Unable to create the account right now. Please try again.'
}

export function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [busy, setBusy] = useState(false)

  function changeMode(nextMode: AuthMode) {
    if (busy || nextMode === mode) return
    setMode(nextMode)
    setFeedback(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    if (mode === 'register') {
      const usernameError = usernameValidationMessage(username)
      if (usernameError) {
        setFeedback({ tone: 'error', message: usernameError })
        return
      }
    }

    if (mode === 'register' && password.length < AUTH_PASSWORD_MIN_LENGTH) {
      setFeedback({
        tone: 'error',
        message: `Password must be at least ${AUTH_PASSWORD_MIN_LENGTH} characters.`,
      })
      return
    }

    setBusy(true)
    setFeedback(null)

    const endpoint =
      mode === 'sign-in' ? '/api/auth/sign-in/email' : '/api/auth/sign-up/email'
    const body =
      mode === 'sign-in'
        ? { email, password }
        : {
            name: displayName,
            username: normalizeUsername(username),
            email,
            password,
          }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as {
          message?: string
        } | null
        setFeedback({
          tone: 'error',
          message:
            mode === 'register' && responseBody?.message
              ? responseBody.message
              : failureMessage(mode, response.status),
        })
        return
      }

      if (mode === 'register') {
        setMode('sign-in')
        setPassword('')
        setFeedback({
          tone: 'success',
          message: 'Account created. Sign in to enter Weaveryn.',
        })
        return
      }

      router.replace('/select')
      router.refresh()
    } catch {
      setFeedback({
        tone: 'error',
        message: failureMessage(mode, 500),
      })
    } finally {
      setBusy(false)
    }
  }

  const feedbackClass =
    feedback?.tone === 'error' ? styles.errorFeedback : styles.successFeedback

  const submitLabel = busy
    ? mode === 'sign-in'
      ? 'Signing in…'
      : 'Creating account…'
    : mode === 'sign-in'
      ? 'Enter Weaveryn'
      : 'Create account'

  return (
    <section className={styles.card} aria-labelledby="auth-title">
      <div className={styles.brand}>
        <BrandLogo className={styles.logo} />
        <span className={styles.wordmark}>Weaveryn</span>
      </div>

      <div className={styles.intro}>
        <p className={styles.eyebrow}>Your stories persist</p>
        <h1 id="auth-title">Enter the weave</h1>
        <p>Continue into your worlds, campaigns, and characters.</p>
      </div>

      <div className={styles.modeSwitch} aria-label="Account action">
        <Button
          type="button"
          variant={mode === 'sign-in' ? 'secondary' : 'ghost'}
          aria-pressed={mode === 'sign-in'}
          disabled={busy}
          onClick={() => changeMode('sign-in')}
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant={mode === 'register' ? 'secondary' : 'ghost'}
          aria-pressed={mode === 'register'}
          disabled={busy}
          onClick={() => changeMode('register')}
        >
          Create account
        </Button>
      </div>

      <form className={styles.form} onSubmit={submit}>
        {mode === 'register' ? (
          <>
            <label className={styles.field}>
              <span>Display name</span>
              <input
                className={styles.input}
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={busy}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Username</span>
              <input
                className={styles.input}
                type="text"
                autoComplete="username"
                minLength={AUTH_USERNAME_MIN_LENGTH}
                maxLength={AUTH_USERNAME_MAX_LENGTH}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={busy}
                aria-describedby="auth-username-help"
                required
              />
              <small id="auth-username-help" className={styles.fieldHelp}>
                Your public @handle. {AUTH_USERNAME_MIN_LENGTH}-
                {AUTH_USERNAME_MAX_LENGTH} characters; letters, numbers, dots,
                underscores, and hyphens.
              </small>
            </label>
          </>
        ) : null}

        <label className={styles.field}>
          <span>Email</span>
          <input
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
            required
          />
        </label>

        <div className={styles.field}>
          <div className={styles.fieldLabelRow}>
            <label htmlFor="auth-password">Password</label>
            {mode === 'register' ? (
              <HintPopover label="Show password requirements">
                <strong className={styles.hintTitle}>Password rules</strong>
                <span>Use at least {AUTH_PASSWORD_MIN_LENGTH} characters.</span>
              </HintPopover>
            ) : null}
          </div>
          <input
            id="auth-password"
            className={styles.input}
            type="password"
            autoComplete={
              mode === 'sign-in' ? 'current-password' : 'new-password'
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
            required
          />
        </div>

        {feedback ? (
          <p
            className={feedbackClass}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {feedback.message}
          </p>
        ) : null}

        <Button type="submit" fullWidth disabled={busy}>
          {submitLabel}
        </Button>
      </form>
    </section>
  )
}
