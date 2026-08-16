'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BrandLogo } from '@/components/ui/brand-logo'
import { uiAssets } from '@/lib/ui-assets'
import styles from './app-shell.module.css'
import desktopStyles from './desktop-context.module.css'

export type AppShellContextKind = 'world' | 'campaign' | 'character'

export interface AppShellContextLink {
  label: string
  href?: string
}

export interface AppShellContext {
  world?: AppShellContextLink
  campaign?: AppShellContextLink
  character?: AppShellContextLink
}

export interface AppShellUser {
  displayName: string | null
  email: string
}

export interface AppShellProps {
  children: ReactNode
  user: AppShellUser
  context?: AppShellContext
}

interface ContextItem extends AppShellContextLink {
  kind: AppShellContextKind
}

const contextKinds: ReadonlyArray<AppShellContextKind> = [
  'world',
  'campaign',
  'character',
]

const contextLabels: Record<AppShellContextKind, string> = {
  world: 'World',
  campaign: 'Campaign',
  character: 'Character',
}

function getContextItems(context?: AppShellContext): ContextItem[] {
  if (!context) return []

  return contextKinds.flatMap((kind) => {
    const item = context[kind]
    return item ? [{ ...item, kind }] : []
  })
}

function getInitials(user: AppShellUser) {
  const source = user.displayName?.trim() || user.email.split('@')[0] || 'W'
  const words = source.split(/\s+/).filter(Boolean)

  if (words.length > 1) {
    return `${words[0][0] ?? ''}${words.at(-1)?.[0] ?? ''}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

function ContextGlyph({ kind }: { kind: AppShellContextKind }) {
  if (kind === 'campaign') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.5 4.5h13v6.2c0 4.4-2.5 7.7-6.5 9.3-4-1.6-6.5-4.9-6.5-9.3V4.5Z" />
        <path d="m12 7 1.2 2.3 2.6.4-1.9 1.8.4 2.6-2.3-1.2-2.3 1.2.4-2.6-1.9-1.8 2.6-.4L12 7Z" />
      </svg>
    )
  }

  if (kind === 'character') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 9.5V7.8C7 4.6 9.1 3 12 3s5 1.6 5 4.8v1.7l-2 2.2V16l-3 2-3-2v-4.3L7 9.5Z" />
        <path d="M9 10.5h2M13 10.5h2M12 18v3" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M4.5 12h15M12 4c2.2 2.1 3.4 4.8 3.4 8S14.2 17.9 12 20M12 4c-2.2 2.1-3.4 4.8-3.4 8S9.8 17.9 12 20" />
    </svg>
  )
}

function ContextEntry({ item }: { item: ContextItem }) {
  const content = (
    <>
      <span className={styles.contextGlyph}>
        <ContextGlyph kind={item.kind} />
      </span>
      <span className={styles.contextCopy}>
        <span className={styles.contextKind}>{contextLabels[item.kind]}</span>
        <span className={styles.contextName}>{item.label}</span>
      </span>
    </>
  )

  if (item.href) {
    return (
      <Link className={styles.contextEntry} href={item.href}>
        {content}
      </Link>
    )
  }

  return <span className={styles.contextEntry}>{content}</span>
}

function DesktopContextEntry({
  kind,
  item,
}: {
  kind: AppShellContextKind
  item?: AppShellContextLink
}) {
  return (
    <Link
      className={desktopStyles.button}
      href={item?.href ?? '/select'}
      aria-label={
        item
          ? `${contextLabels[kind]}: ${item.label}`
          : `Choose ${contextLabels[kind].toLowerCase()}`
      }
    >
      <span className={styles.contextGlyph}>
        <ContextGlyph kind={kind} />
      </span>
      <span className={styles.contextCopy}>
        {item ? (
          <>
            <span className={styles.contextKind}>{contextLabels[kind]}</span>
            <span className={styles.contextName}>{item.label}</span>
          </>
        ) : (
          <span className={desktopStyles.placeholder}>{contextLabels[kind]}</span>
        )}
      </span>
      <span className={desktopStyles.chevron} aria-hidden="true">
        ⌄
      </span>
    </Link>
  )
}

export function AppShell({ children, user, context }: AppShellProps) {
  const router = useRouter()
  const [accountOpen, setAccountOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const contextItems = getContextItems(context)
  const activeContext = contextItems.at(-1)
  const displayName = user.displayName?.trim() || user.email
  const background = uiAssets.backgrounds.appShell

  useEffect(() => {
    if (!accountOpen && !contextOpen) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountOpen(false)
        setContextOpen(false)
      }
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [accountOpen, contextOpen])

  function toggleAccount() {
    setContextOpen(false)
    setAccountOpen((open) => !open)
    setSignOutError(null)
  }

  function toggleContext() {
    setAccountOpen(false)
    setContextOpen((open) => !open)
  }

  async function signOut() {
    if (signingOut) return

    setSigningOut(true)
    setSignOutError(null)

    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        setSignOutError('Unable to log out right now. Please try again.')
        return
      }

      router.replace('/login')
      router.refresh()
    } catch {
      setSignOutError('Unable to log out right now. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.background} aria-hidden="true">
        <Image
          src={background.src}
          alt=""
          fill
          preload
          sizes="100vw"
          className={styles.backgroundImage}
        />
        <div className={styles.backgroundVeil} />
      </div>

      <header className={styles.header}>
        <Link className={styles.brand} href="/select" aria-label="Weaveryn home">
          <BrandLogo className={styles.brandLogo} preload />
          <span className={styles.brandName}>Weaveryn</span>
        </Link>

        <nav className={styles.desktopContext} aria-label="Current context">
          <div className={styles.contextTrail}>
            {contextKinds.map((kind) => (
              <div className={styles.contextTrailSlot} key={kind}>
                <DesktopContextEntry kind={kind} item={context?.[kind]} />
              </div>
            ))}
          </div>
        </nav>

        <button
          type="button"
          className={styles.mobileContextButton}
          aria-haspopup="dialog"
          aria-expanded={contextOpen}
          aria-controls="mobile-context-sheet"
          onClick={toggleContext}
        >
          {activeContext ? (
            <span className={styles.mobileContextGlyph}>
              <ContextGlyph kind={activeContext.kind} />
            </span>
          ) : null}
          <span className={styles.mobileContextLabel}>
            {activeContext?.label ?? 'Choose Entity'}
          </span>
          <span className={styles.chevron} aria-hidden="true">
            ⌄
          </span>
        </button>

        <div className={styles.accountArea}>
          <button
            type="button"
            className={styles.profileButton}
            aria-haspopup="dialog"
            aria-expanded={accountOpen}
            aria-controls="account-menu"
            onClick={toggleAccount}
          >
            <span className={styles.avatar} aria-hidden="true">
              {getInitials(user)}
            </span>
            <span className={styles.profileName}>{displayName}</span>
            <span className={styles.profileChevron} aria-hidden="true">
              ⌄
            </span>
          </button>

          {accountOpen ? (
            <>
              <button
                type="button"
                className={styles.dismissLayer}
                tabIndex={-1}
                aria-label="Close account menu"
                onClick={() => setAccountOpen(false)}
              />
              <section
                id="account-menu"
                className={styles.accountMenu}
                role="dialog"
                aria-label="Account menu"
              >
                <div className={styles.accountIdentity}>
                  <span className={styles.accountAvatar} aria-hidden="true">
                    {getInitials(user)}
                  </span>
                  <div>
                    <strong>{displayName}</strong>
                    <span>{user.email}</span>
                  </div>
                </div>

                <div className={styles.accountDivider} />

                <Link
                  className={styles.accountAction}
                  href="/select"
                  onClick={() => setAccountOpen(false)}
                >
                  <span aria-hidden="true">◇</span>
                  Choose Entity
                </Link>
                <button
                  type="button"
                  className={`${styles.accountAction} ${styles.logoutAction}`}
                  disabled={signingOut}
                  onClick={signOut}
                >
                  <span aria-hidden="true">↪</span>
                  {signingOut ? 'Logging out…' : 'Log out'}
                </button>

                {signOutError ? (
                  <p className={styles.accountError} role="alert">
                    {signOutError}
                  </p>
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      </header>

      <main className={styles.content}>{children}</main>

      {contextOpen ? (
        <>
          <button
            type="button"
            className={styles.dismissLayer}
            tabIndex={-1}
            aria-label="Close context selector"
            onClick={() => setContextOpen(false)}
          />
          <section
            id="mobile-context-sheet"
            className={styles.contextSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="context-sheet-title"
          >
            <div className={styles.sheetHandle} aria-hidden="true" />
            <h2 id="context-sheet-title">Current context</h2>

            {contextItems.length > 0 ? (
              <div className={styles.sheetContextList}>
                {contextItems.map((item) => (
                  <div className={styles.sheetContextItem} key={item.kind}>
                    <ContextEntry item={item} />
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noContextCopy}>
                No World, Campaign, or Character is selected yet.
              </p>
            )}

            <div className={styles.sheetDivider} />
            <p className={styles.sheetLabel}>Change context</p>
            <Link
              className={styles.changeContextLink}
              href="/select"
              onClick={() => setContextOpen(false)}
            >
              <span className={styles.changeContextGlyph} aria-hidden="true">
                ◇
              </span>
              <span>
                <strong>Choose Entity</strong>
                <small>Switch to another World, Campaign, or Character</small>
              </span>
              <span aria-hidden="true">›</span>
            </Link>

            <button
              type="button"
              className={styles.closeSheetButton}
              onClick={() => setContextOpen(false)}
            >
              Close
            </button>
          </section>
        </>
      ) : null}
    </div>
  )
}
