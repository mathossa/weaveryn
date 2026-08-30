'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  campaignRoleLabel,
  worldRoleLabel,
  type CampaignRoleCode,
  type WorldRoleCode,
} from '@/lib/role-labels'
import { uiAssets } from '@/lib/ui-assets'
import { SelectBackgroundParticles } from '../_components/select-background-particles'
import { SelectLogoutButton } from '../_components/select-logout-button'
import styles from './join.module.css'

interface InvitationPreview {
  id: string
  kind: 'WORLD' | 'CAMPAIGN'
  role: WorldRoleCode | CampaignRoleCode
  targetName: string
  worldName: string | null
  status: 'ACTIVE' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'
  expiresAt: string
  createdAt: string
}

interface AcceptedWorldInvitation {
  kind: 'WORLD'
  worldId: string
  role: WorldRoleCode
}

interface AcceptedCampaignInvitation {
  kind: 'CAMPAIGN'
  worldId: string
  campaignId: string
  role: CampaignRoleCode
}

type AcceptedInvitation = AcceptedWorldInvitation | AcceptedCampaignInvitation

type InvitationApiBody = {
  invitation?: InvitationPreview
  accepted?: AcceptedInvitation
  error?: { message?: string }
}

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

function invitationRoleLabel(invitation: InvitationPreview) {
  return invitation.kind === 'CAMPAIGN'
    ? campaignRoleLabel(invitation.role as CampaignRoleCode)
    : worldRoleLabel(invitation.role as WorldRoleCode)
}

function invitationRoleHint(invitation: InvitationPreview) {
  if (invitation.kind === 'CAMPAIGN') {
    if (invitation.role === 'PLAYER') {
      return 'Join as a Threadwalker. After joining, choose or create the Character who will enter this Campaign.'
    }
    if (invitation.role === 'SPECTATOR') {
      return 'Join as a Threadwatcher. You can observe this Campaign without attaching a Character.'
    }
    if (invitation.role === 'ASSISTANT_GM') {
      return 'Join as an Assistant Weaver with the Campaign management access delegated to that role.'
    }
    return 'Join as a Weaver and enter the Campaign through its Weaver view.'
  }

  if (invitation.role === 'VIEWER') {
    return 'Join this World as a Threadwatcher with read-only World access.'
  }
  if (invitation.role === 'ADMIN') {
    return 'Join this World as a Weaver with World administration access.'
  }
  return 'Join this World as a Threadwalker and become part of its shared World space.'
}

function invitationStateMessage(invitation: InvitationPreview) {
  if (invitation.status === 'ACCEPTED') {
    return 'This invitation has already been used.'
  }
  if (invitation.status === 'REVOKED') {
    return 'This invitation has been revoked by its creator.'
  }
  if (invitation.status === 'EXPIRED') {
    return 'This invitation has expired.'
  }
  return null
}

function destinationForInvitation(invitation: AcceptedInvitation) {
  if (invitation.kind === 'WORLD') {
    return `/world/${invitation.worldId}`
  }

  if (invitation.role === 'PLAYER') {
    const query = new URLSearchParams({
      world: invitation.worldId,
      campaign: invitation.campaignId,
    })
    return `/character?${query.toString()}`
  }

  const campaignPath = `/world/${invitation.worldId}/campaign/${invitation.campaignId}`
  return invitation.role === 'GM' || invitation.role === 'ASSISTANT_GM'
    ? `${campaignPath}?mode=weaver`
    : campaignPath
}

function formatExpiry(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  return `${new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)} UTC`
}

export function JoinInviteForm({
  initialToken,
}: {
  initialToken: string | null
}) {
  const router = useRouter()
  const [value, setValue] = useState(initialToken ?? '')
  const [reviewedToken, setReviewedToken] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reviewToken = useCallback(async (token: string) => {
    setReviewing(true)
    setError(null)
    setInvitation(null)
    setReviewedToken(null)

    try {
      const response = await fetch(
        `/api/v1/invitations/${encodeURIComponent(token)}`,
        {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        },
      )
      const body = (await response
        .json()
        .catch(() => null)) as InvitationApiBody | null

      if (!response.ok || !body?.invitation) {
        setError(
          body?.error?.message ??
            'This invitation could not be reviewed. Check the link and try again.',
        )
        return
      }

      setInvitation(body.invitation)
      setReviewedToken(token)
      window.history.replaceState(
        null,
        '',
        `/select/join?token=${encodeURIComponent(token)}`,
      )
    } catch {
      setError(
        'This invitation could not be reviewed. Check the link and try again.',
      )
    } finally {
      setReviewing(false)
    }
  }, [])

  useEffect(() => {
    if (!initialToken) return

    const timeoutId = window.setTimeout(() => {
      void reviewToken(initialToken)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [initialToken, reviewToken])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      router.push('/select')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = tokenFromInput(value)
    if (!token) {
      setError('Paste a Weaveryn invitation link or invitation token.')
      return
    }

    void reviewToken(token)
  }

  function useAnotherInvitation() {
    setInvitation(null)
    setReviewedToken(null)
    setError(null)
    setValue('')
    window.history.replaceState(null, '', '/select/join')
  }

  async function acceptInvitation() {
    if (
      !reviewedToken ||
      !invitation ||
      invitation.status !== 'ACTIVE' ||
      joining
    ) {
      return
    }

    setJoining(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/v1/invitations/${encodeURIComponent(reviewedToken)}`,
        {
          method: 'POST',
          credentials: 'same-origin',
        },
      )
      const body = (await response
        .json()
        .catch(() => null)) as InvitationApiBody | null

      if (!response.ok || !body?.accepted) {
        setError(
          body?.error?.message ??
            'Unable to accept this invitation right now. Please try again.',
        )
        return
      }

      router.replace(destinationForInvitation(body.accepted))
      router.refresh()
    } catch {
      setError('Unable to accept this invitation right now. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  const stateMessage = invitation ? invitationStateMessage(invitation) : null

  return (
    <section className={styles.stage} aria-label="Join with invitation">
      <div className={styles.background} aria-hidden="true">
        <Image
          src={uiAssets.select.backgroundDesktop.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.backgroundImage}
        />
      </div>
      <SelectBackgroundParticles />

      <Link className={styles.backLink} href="/select">
        <span aria-hidden="true">←</span> Back
      </Link>
      <SelectLogoutButton />

      <div className={styles.panelShell}>
        <main className={styles.panel}>
          <div className={styles.panelContent}>
            {!invitation ? (
              <>
                <header className={styles.panelHeader}>
                  <span className={styles.eyebrow}>An open thread</span>
                  <h1>Join with invitation</h1>
                  <p>
                    Paste the invitation you received. Nothing changes until you
                    review where the thread leads and choose to join.
                  </p>
                </header>

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
                      disabled={reviewing}
                    />
                  </label>

                  {error ? (
                    <p className={styles.error} role="alert" aria-live="polite">
                      {error}
                    </p>
                  ) : null}

                  <button
                    className={styles.primaryAction}
                    type="submit"
                    disabled={reviewing}
                  >
                    {reviewing ? 'Reviewing invitation…' : 'Review invitation'}
                  </button>
                </form>

                <p className={styles.helperCopy}>
                  World and Campaign invitations are supported. Reviewing an
                  invitation never accepts it automatically.
                </p>
              </>
            ) : (
              <>
                <header className={styles.panelHeader}>
                  <span className={styles.eyebrow}>
                    {invitation.kind === 'WORLD'
                      ? 'World invitation'
                      : 'Campaign invitation'}
                  </span>
                  <h1>{invitation.targetName}</h1>
                  <p>
                    Review the destination and the role being offered before
                    joining.
                  </p>
                </header>

                <section
                  className={styles.summary}
                  aria-label="Invitation summary"
                >
                  <div className={styles.summaryRow}>
                    <span>Destination</span>
                    <strong>
                      {invitation.kind === 'WORLD' ? 'World' : 'Campaign'}
                    </strong>
                  </div>
                  {invitation.kind === 'CAMPAIGN' && invitation.worldName ? (
                    <div className={styles.summaryRow}>
                      <span>World</span>
                      <strong>{invitation.worldName}</strong>
                    </div>
                  ) : null}
                  <div className={styles.summaryRow}>
                    <span>Invitation expires</span>
                    <strong>{formatExpiry(invitation.expiresAt)}</strong>
                  </div>
                </section>

                <section className={styles.roleCard} aria-label="Granted role">
                  <span className={styles.roleLabel}>Your role</span>
                  <strong>{invitationRoleLabel(invitation)}</strong>
                  <p>{invitationRoleHint(invitation)}</p>
                </section>

                {stateMessage ? (
                  <div className={styles.closedState} role="status">
                    <strong>This thread is closed</strong>
                    <p>{stateMessage}</p>
                  </div>
                ) : null}

                {error ? (
                  <p className={styles.error} role="alert" aria-live="polite">
                    {error}
                  </p>
                ) : null}

                <div className={styles.reviewActions}>
                  {!stateMessage ? (
                    <button
                      className={styles.primaryAction}
                      type="button"
                      onClick={() => void acceptInvitation()}
                      disabled={joining}
                      aria-label="Accept invitation"
                    >
                      {joining
                        ? 'Joining…'
                        : invitation.kind === 'WORLD'
                          ? 'Join World'
                          : 'Join Campaign'}
                    </button>
                  ) : null}
                  <button
                    className={styles.secondaryAction}
                    type="button"
                    onClick={useAnotherInvitation}
                    disabled={joining}
                  >
                    Use another invitation
                  </button>
                </div>

                {!stateMessage ? (
                  <p className={styles.helperCopy}>
                    Nothing is added to your account until you choose the join
                    action above.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </main>
      </div>
    </section>
  )
}
