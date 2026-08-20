'use client'

import { useState } from 'react'
import {
  MembershipInviteManager,
  type ManagedInvitation,
} from '@/components/invitations/membership-invite-manager'
import styles from '../world.module.css'

export function WorldInviteDialog({
  endpoint,
  roles,
  initialInvitations,
}: {
  endpoint: string
  roles: readonly string[]
  initialInvitations: ManagedInvitation[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className={styles.actionItem}
        type="button"
        onClick={() => setOpen(true)}
      >
        <span className={styles.actionIcon} aria-hidden="true">
          ↗
        </span>
        <span>
          <strong>Create invite link</strong>
          <small>Generate a single-use World invitation</small>
        </span>
        <span className={styles.actionArrow} aria-hidden="true">
          ›
        </span>
      </button>

      {open ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="world-invite-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>World invitation</span>
                <h2 id="world-invite-title">Create invite link</h2>
              </div>
              <button
                className={styles.modalClose}
                type="button"
                aria-label="Close invite dialog"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <p className={styles.modalIntro}>
              Choose the World role, create a single-use link, then copy it before
              closing this window.
            </p>
            <MembershipInviteManager
              endpoint={endpoint}
              roles={roles}
              targetKind="World"
              initialInvitations={initialInvitations}
            />
          </section>
        </div>
      ) : null}
    </>
  )
}
