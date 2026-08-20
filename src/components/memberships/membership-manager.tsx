'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  campaignRoleLabel,
  worldRoleLabel,
  type CampaignRoleCode,
  type WorldRoleCode,
} from '@/lib/role-labels'
import styles from './membership-manager.module.css'

export interface ManagedMembershipView {
  userId: string
  username: string
  displayName: string | null
  role: string
  activeCharacterCount?: number
}

interface MembershipManagerProps {
  endpoint: string
  roles: readonly string[]
  targetKind: 'World' | 'Campaign'
  initialMembers: ManagedMembershipView[]
}

type Feedback = { tone: 'error' | 'success'; message: string } | null

function roleLabel(role: string, targetKind: 'World' | 'Campaign') {
  return targetKind === 'Campaign'
    ? campaignRoleLabel(role as CampaignRoleCode)
    : worldRoleLabel(role as WorldRoleCode)
}

export function MembershipManager({
  endpoint,
  roles,
  targetKind,
  initialMembers,
}: MembershipManagerProps) {
  const [members, setMembers] = useState(initialMembers)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function changeRole(member: ManagedMembershipView, nextRole: string) {
    if (busyUserId || nextRole === member.role) return
    setBusyUserId(member.userId)
    setFeedback(null)

    try {
      const response = await fetch(
        `${endpoint}/${encodeURIComponent(member.userId)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ role: nextRole }),
        },
      )
      const body = (await response.json().catch(() => null)) as {
        membership?: { role?: string }
        error?: { message?: string }
      } | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message:
            body?.error?.message ??
            `Unable to change this ${targetKind} membership.`,
        })
        return
      }

      setMembers((current) =>
        current.map((value) =>
          value.userId === member.userId
            ? { ...value, role: body?.membership?.role ?? nextRole }
            : value,
        ),
      )
      setFeedback({
        tone: 'success',
        message: `${member.displayName ?? `@${member.username}`} is now ${roleLabel(nextRole, targetKind)}.`,
      })
    } catch {
      setFeedback({
        tone: 'error',
        message: `Unable to change this ${targetKind} membership.`,
      })
    } finally {
      setBusyUserId(null)
    }
  }

  async function removeMember(member: ManagedMembershipView) {
    if (busyUserId) return
    const label = member.displayName ?? `@${member.username}`
    if (
      !window.confirm(
        `Remove ${label} from this ${targetKind}? This removes membership access, not their portable Character or WorldCharacter.`,
      )
    ) {
      return
    }

    setBusyUserId(member.userId)
    setFeedback(null)
    try {
      const response = await fetch(
        `${endpoint}/${encodeURIComponent(member.userId)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      )
      const body =
        response.status === 204
          ? null
          : ((await response.json().catch(() => null)) as {
              error?: { message?: string }
            } | null)

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message:
            body?.error?.message ??
            `Unable to remove this ${targetKind} membership.`,
        })
        return
      }

      setMembers((current) =>
        current.filter((value) => value.userId !== member.userId),
      )
      setFeedback({
        tone: 'success',
        message: `${label} was removed from this ${targetKind}.`,
      })
    } catch {
      setFeedback({
        tone: 'error',
        message: `Unable to remove this ${targetKind} membership.`,
      })
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <div className={styles.manager}>
      {feedback ? (
        <p
          className={`${styles.feedback} ${feedback.tone === 'error' ? styles.error : styles.success}`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {feedback.message}
        </p>
      ) : null}

      {members.length === 0 ? (
        <p className={styles.empty}>No non-owner memberships yet.</p>
      ) : (
        <div className={styles.list}>
          {members.map((member) => {
            const activeCharacterCount = member.activeCharacterCount ?? 0
            const busy = busyUserId === member.userId
            return (
              <div className={styles.member} key={member.userId}>
                <div className={styles.identity}>
                  <strong>{member.displayName ?? `@${member.username}`}</strong>
                  <span>@{member.username}</span>
                  {activeCharacterCount > 0 ? (
                    <span className={styles.note}>
                      {activeCharacterCount} active Campaign Character
                      {activeCharacterCount === 1 ? '' : 's'} — remove
                      participation before removing this membership or changing
                      it to Threadwatcher.
                    </span>
                  ) : null}
                </div>

                <select
                  className={styles.role}
                  value={member.role}
                  disabled={Boolean(busyUserId)}
                  aria-label={`Role for ${member.displayName ?? member.username}`}
                  onChange={(event) => changeRole(member, event.target.value)}
                >
                  {roles.map((role) => (
                    <option
                      key={role}
                      value={role}
                      disabled={
                        role === 'SPECTATOR' &&
                        activeCharacterCount > 0 &&
                        member.role !== 'SPECTATOR'
                      }
                    >
                      {roleLabel(role, targetKind)}
                    </option>
                  ))}
                </select>

                <div className={styles.actions}>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={Boolean(busyUserId) || activeCharacterCount > 0}
                    onClick={() => removeMember(member)}
                  >
                    {busy ? 'Removing…' : 'Remove'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
