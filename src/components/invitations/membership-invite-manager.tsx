'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import styles from './membership-invite-manager.module.css'

export interface ManagedInvitation {
  id: string
  role: string
  expiresAt: string
}

interface MembershipInviteManagerProps {
  endpoint: string
  roles: readonly string[]
  targetKind: 'World' | 'Campaign'
  initialInvitations: ManagedInvitation[]
}

type Feedback =
  | { tone: 'error' | 'success'; message: string }
  | null

function roleLabel(role: string) {
  return role.replaceAll('_', ' ')
}

function expiresLabel(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function MembershipInviteManager({
  endpoint,
  roles,
  targetKind,
  initialInvitations,
}: MembershipInviteManagerProps) {
  const defaultRole = roles[0] ?? ''
  const [role, setRole] = useState(defaultRole)
  const [invitations, setInvitations] =
    useState<ManagedInvitation[]>(initialInvitations)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [generatedInvitationId, setGeneratedInvitationId] = useState<
    string | null
  >(null)
  const [busy, setBusy] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const roleOptions = useMemo(
    () => roles.map((value) => ({ value, label: roleLabel(value) })),
    [roles],
  )

  function removeInactiveInvitation(invitationId: string) {
    setInvitations((current) =>
      current.filter((invitation) => invitation.id !== invitationId),
    )
    if (generatedInvitationId === invitationId) {
      setGeneratedInvitationId(null)
      setGeneratedLink(null)
    }
  }

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !role) return

    setBusy(true)
    setFeedback(null)
    setGeneratedLink(null)
    setGeneratedInvitationId(null)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ role }),
      })
      const body = (await response.json().catch(() => null)) as {
        invitation?: { id: string; role: string; expiresAt: string }
        invitePath?: string
        error?: { message?: string }
      } | null

      if (!response.ok || !body?.invitation || !body.invitePath) {
        setFeedback({
          tone: 'error',
          message:
            body?.error?.message ??
            `Unable to create this ${targetKind} invitation.`,
        })
        return
      }

      const createdInvitation = body.invitation
      const invitePath = body.invitePath
      setInvitations((current) => [createdInvitation, ...current])
      setGeneratedInvitationId(createdInvitation.id)
      setGeneratedLink(new URL(invitePath, window.location.origin).toString())
      setFeedback({
        tone: 'success',
        message: 'Invitation created. Copy the link before leaving this page.',
      })
    } catch {
      setFeedback({
        tone: 'error',
        message: `Unable to create this ${targetKind} invitation.`,
      })
    } finally {
      setBusy(false)
    }
  }

  async function copyGeneratedLink() {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      setFeedback({ tone: 'success', message: 'Invitation link copied.' })
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Could not copy automatically. Select and copy the link.',
      })
    }
  }

  async function revoke(invitationId: string) {
    if (revokingId) return
    setRevokingId(invitationId)
    setFeedback(null)

    try {
      const response = await fetch(
        `/api/v1/invitations/manage/${invitationId}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
        },
      )
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string; message?: string }
      } | null

      if (!response.ok) {
        const inactiveCodes = new Set([
          'INVITATION_ALREADY_USED',
          'INVITATION_REVOKED',
          'INVITATION_EXPIRED',
        ])
        if (body?.error?.code && inactiveCodes.has(body.error.code)) {
          removeInactiveInvitation(invitationId)
          setFeedback({
            tone: 'success',
            message:
              body.error.code === 'INVITATION_ALREADY_USED'
                ? 'This invitation was already accepted and is no longer active.'
                : 'This invitation is no longer active.',
          })
          return
        }

        setFeedback({
          tone: 'error',
          message: body?.error?.message ?? 'Unable to revoke this invitation.',
        })
        return
      }

      removeInactiveInvitation(invitationId)
      setFeedback({ tone: 'success', message: 'Invitation revoked.' })
    } catch {
      setFeedback({ tone: 'error', message: 'Unable to revoke this invitation.' })
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className={styles.manager}>
      <form className={styles.createRow} onSubmit={createInvitation}>
        <label className={styles.field}>
          <span>Role</span>
          <select
            className={styles.select}
            value={role}
            onChange={(event) => setRole(event.target.value)}
            disabled={busy}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={busy || !role}>
          {busy ? 'Creating…' : 'Create invite link'}
        </Button>
      </form>

      {generatedLink ? (
        <div className={styles.generated}>
          <label className={styles.field}>
            <span>New invitation link</span>
            <input
              className={styles.linkInput}
              value={generatedLink}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <Button type="button" variant="secondary" onClick={copyGeneratedLink}>
            Copy link
          </Button>
        </div>
      ) : null}

      {feedback ? (
        <p
          className={
            feedback.tone === 'error' ? styles.error : styles.success
          }
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {feedback.message}
        </p>
      ) : null}

      <div className={styles.activeInvites}>
        <div>
          <h3>Active invitations</h3>
          <p className={styles.note}>
            For security, an invitation link is only shown when it is created.
            Revoke and create a new link if the original was lost.
          </p>
        </div>

        {invitations.length === 0 ? (
          <p className={styles.empty}>No active invitations.</p>
        ) : (
          <div className={styles.list}>
            {invitations.map((invitation) => (
              <div className={styles.invitation} key={invitation.id}>
                <div>
                  <strong>{roleLabel(invitation.role)}</strong>
                  <span>Expires {expiresLabel(invitation.expiresAt)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={Boolean(revokingId)}
                  onClick={() => revoke(invitation.id)}
                >
                  {revokingId === invitation.id ? 'Revoking…' : 'Revoke'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
