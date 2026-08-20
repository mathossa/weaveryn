import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { BrandLogo } from '@/components/ui/brand-logo'
import { AuthShell } from '@/components/ui/auth-shell'
import { getAuthenticatedUser } from '@/server/auth'
import {
  MembershipInvitationDomainError,
  membershipInvitationService,
  type MembershipInvitationStatus,
  type MembershipInvitationView,
} from '@/server/invitations'
import { InviteAcceptButton } from './invite-accept-button'
import styles from '../invite.module.css'

export const metadata: Metadata = {
  title: 'Invitation',
}

interface InvitePageProps {
  params: Promise<{ token: string }>
}

function statusMessage(status: MembershipInvitationStatus) {
  if (status === 'ACCEPTED') return 'This invitation has already been used.'
  if (status === 'REVOKED') return 'This invitation has been revoked.'
  if (status === 'EXPIRED') return 'This invitation has expired.'
  return null
}

export default async function InvitePage({ params }: InvitePageProps) {
  const [{ token }, user] = await Promise.all([
    params,
    getAuthenticatedUser(new Headers(await headers())),
  ])

  let invitation: MembershipInvitationView | undefined
  let unavailableMessage: string | null = null
  try {
    invitation = await membershipInvitationService.previewInvitation(token)
  } catch (error) {
    if (error instanceof MembershipInvitationDomainError) {
      unavailableMessage = error.message
    } else {
      throw error
    }
  }

  const stateMessage = invitation ? statusMessage(invitation.status) : null
  const invitePath = `/invite/${encodeURIComponent(token)}`
  const loginHref = `/login?next=${encodeURIComponent(invitePath)}`

  return (
    <AuthShell>
      <section className={styles.card} aria-labelledby="invite-title">
        <div className={styles.brand}>
          <BrandLogo />
          <p className={styles.eyebrow}>Weaveryn invitation</p>
        </div>

        {invitation ? (
          <>
            <div>
              <p className={styles.eyebrow}>
                Join {invitation.kind === 'WORLD' ? 'World' : 'Campaign'}
              </p>
              <h1 id="invite-title" className={styles.title}>
                {invitation.targetName}
              </h1>
              <p className={styles.copy}>
                Review the destination and role before accepting this invitation.
              </p>
            </div>

            <div className={styles.summary}>
              <div className={styles.row}>
                <span className={styles.label}>Destination</span>
                <span className={styles.value}>
                  {invitation.kind === 'WORLD' ? 'World' : 'Campaign'}
                </span>
              </div>
              {invitation.kind === 'CAMPAIGN' && invitation.worldName ? (
                <div className={styles.row}>
                  <span className={styles.label}>World</span>
                  <span className={styles.value}>{invitation.worldName}</span>
                </div>
              ) : null}
              <div className={styles.row}>
                <span className={styles.label}>Role</span>
                <span className={styles.value}>
                  {invitation.role.replaceAll('_', ' ')}
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Expires</span>
                <span className={styles.value}>
                  {new Intl.DateTimeFormat('en-GB', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'UTC',
                  }).format(invitation.expiresAt)}{' '}
                  UTC
                </span>
              </div>
            </div>

            {stateMessage ? (
              <p className={styles.status}>{stateMessage}</p>
            ) : user ? (
              <div className={styles.actions}>
                <InviteAcceptButton token={token} />
                <Link className={styles.link} href="/select">
                  Not now
                </Link>
              </div>
            ) : (
              <div>
                <p className={styles.copy}>
                  Sign in or create an account first. You will return to this
                  invitation afterward.
                </p>
                <div className={styles.actions}>
                  <Link className={styles.link} href={loginHref}>
                    Sign in or create account
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <p className={styles.eyebrow}>Invitation unavailable</p>
              <h1 id="invite-title" className={styles.title}>
                This link cannot be used
              </h1>
            </div>
            <p className={styles.status}>
              {unavailableMessage ?? 'This invitation is not available.'}
            </p>
            <div className={styles.actions}>
              <Link className={styles.link} href={user ? '/select' : '/login'}>
                {user ? 'Back to selection' : 'Sign in'}
              </Link>
            </div>
          </>
        )}
      </section>
    </AuthShell>
  )
}
