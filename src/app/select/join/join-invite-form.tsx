'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import styles from './join.module.css'

function tokenFromInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed, window.location.origin)
    const match = url.pathname.match(/^\/invite\/([^/]+)\/?$/)
    if (match?.[1]) return decodeURIComponent(match[1])
  } catch {
    // Raw tokens are handled below.
  }

  if (!trimmed.includes('/') && !trimmed.includes(' ')) return trimmed
  return null
}

export function JoinInviteForm() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = tokenFromInput(value)
    if (!token) {
      setError('Paste a Weaveryn invitation link or invitation token.')
      return
    }

    setError(null)
    router.push(`/invite/${encodeURIComponent(token)}`)
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        <span>Invitation link</span>
        <input
          className={styles.input}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://…/invite/…"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button type="submit">Open invitation</Button>
      </div>
    </form>
  )
}
