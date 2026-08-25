'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { BrandLogo } from '@/components/ui/brand-logo'
import { BrandWordmark } from '@/components/ui/brand-wordmark'
import { uiAssets } from '@/lib/ui-assets'
import styles from './app-shell.module.css'
import switcherStyles from './context-switcher.module.css'

export type AppShellContextKind = 'world' | 'campaign' | 'character'
export type AppShellContextMode = 'weaver' | 'threadwatcher'
export type AppShellVariant = 'default' | 'launcher'

export interface AppShellContextLink {
  id?: string
  label: string
  href?: string
}

export interface AppShellContext {
  world?: AppShellContextLink
  campaign?: AppShellContextLink
  character?: AppShellContextLink
  mode?: AppShellContextMode
}

export interface AppShellUser {
  displayName: string | null
  username: string
  email: string
}

export interface AppShellProps {
  children: ReactNode
  user: AppShellUser
  context?: AppShellContext
  variant?: AppShellVariant
}

interface ContextItem extends AppShellContextLink {
  kind: AppShellContextKind
}

type ContextNavigationTracking =
  | {
      kind: 'CHARACTER'
      worldCharacterId: string
      campaignId?: string | null
    }
  | {
      kind: 'WEAVER'
      worldId: string
      campaignId?: string | null
    }

interface ContextNavigationOption {
  id: string
  label: string
  href: string
  active: boolean
  meta?: string
  tracking?: ContextNavigationTracking
}

type ContextOptionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; options: ContextNavigationOption[] }
  | { status: 'error' }

interface ContextIdentifiers {
  worldId?: string
  campaignId?: string
  worldCharacterId?: string
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
  const source =
    user.displayName?.trim() || user.username || user.email.split('@')[0] || 'W'
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

function contextIdFromHref(
  href: string | undefined,
  kind: AppShellContextKind,
) {
  if (!href) return undefined
  const segment =
    kind === 'world' ? 'world' : kind === 'campaign' ? 'campaign' : 'character'
  const match = href.match(new RegExp(`/${segment}/([^/?#]+)`))
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

function getContextMode(
  context?: AppShellContext,
): AppShellContextMode | undefined {
  if (context?.mode) return context.mode

  for (const item of [context?.character, context?.campaign, context?.world]) {
    if (!item?.href) continue
    const query = item.href.split('?')[1]
    if (!query) continue
    const mode = new URLSearchParams(query).get('mode')
    if (mode === 'weaver' || mode === 'threadwatcher') return mode
  }

  return undefined
}

function getContextIdentifiers(
  context: AppShellContext | undefined,
  pathname: string,
  searchParams?: URLSearchParams,
): ContextIdentifiers {
  const worldId =
    context?.world?.id ??
    contextIdFromHref(context?.world?.href, 'world') ??
    contextIdFromHref(pathname, 'world') ??
    searchParams?.get('world') ??
    undefined
  const campaignId =
    context?.campaign?.id ??
    contextIdFromHref(context?.campaign?.href, 'campaign') ??
    contextIdFromHref(pathname, 'campaign') ??
    searchParams?.get('campaign') ??
    undefined
  const worldCharacterId =
    context?.character?.id ??
    contextIdFromHref(context?.character?.href, 'character') ??
    contextIdFromHref(pathname, 'character') ??
    searchParams?.get('character') ??
    undefined

  return { worldId, campaignId, worldCharacterId }
}

function canSwitchContext(
  kind: AppShellContextKind,
  identifiers: ContextIdentifiers,
  mode?: AppShellContextMode,
) {
  if (kind === 'world') return true
  if (kind === 'campaign') return Boolean(identifiers.worldId)
  return Boolean(identifiers.worldId) && mode !== 'threadwatcher'
}

function ContextButtonContent({
  kind,
  item,
  showChevron,
}: {
  kind: AppShellContextKind
  item?: AppShellContextLink
  showChevron: boolean
}) {
  return (
    <>
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
          <span className={switcherStyles.placeholder}>
            {contextLabels[kind]}
          </span>
        )}
      </span>
      {showChevron ? (
        <span className={switcherStyles.chevron} aria-hidden="true">
          ⌄
        </span>
      ) : null}
    </>
  )
}

function ContextOptionsContent({
  state,
  onSelect,
  onRetry,
}: {
  state: ContextOptionState
  onSelect: (
    event: ReactMouseEvent<HTMLAnchorElement>,
    option: ContextNavigationOption,
  ) => void
  onRetry: () => void
}) {
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <p className={switcherStyles.feedback} role="status">
        Loading choices…
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <div className={switcherStyles.errorState}>
        <p>Could not load authorized choices.</p>
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }

  if (state.options.length === 0) {
    return (
      <p className={switcherStyles.feedback}>
        No authorized choices are available here.
      </p>
    )
  }

  return (
    <div className={switcherStyles.options}>
      {state.options.map((option) => (
        <Link
          className={switcherStyles.option}
          data-active={option.active ? 'true' : 'false'}
          href={option.href}
          key={option.id}
          role="menuitem"
          aria-current={option.active ? 'page' : undefined}
          onClick={(event) => onSelect(event, option)}
        >
          <span className={switcherStyles.optionCopy}>
            <strong>{option.label}</strong>
            {option.meta ? <small>{option.meta}</small> : null}
          </span>
          {option.active ? (
            <span className={switcherStyles.activeMark} aria-hidden="true">
              ✓
            </span>
          ) : (
            <span className={switcherStyles.optionArrow} aria-hidden="true">
              ›
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}

function DesktopContextEntry({
  kind,
  item,
  canSwitch,
  open,
  state,
  onToggle,
  onSelect,
  onRetry,
}: {
  kind: AppShellContextKind
  item?: AppShellContextLink
  canSwitch: boolean
  open: boolean
  state: ContextOptionState
  onToggle: () => void
  onSelect: (
    event: ReactMouseEvent<HTMLAnchorElement>,
    option: ContextNavigationOption,
  ) => void
  onRetry: () => void
}) {
  if (!canSwitch) {
    return (
      <Link
        className={switcherStyles.button}
        href={item?.href ?? '/select'}
        aria-label={
          item
            ? `${contextLabels[kind]}: ${item.label}`
            : `Choose ${contextLabels[kind].toLowerCase()}`
        }
      >
        <ContextButtonContent kind={kind} item={item} showChevron={false} />
      </Link>
    )
  }

  return (
    <div
      className={switcherStyles.slot}
      data-kind={kind}
      data-open={open ? 'true' : 'false'}
    >
      <button
        type="button"
        className={switcherStyles.button}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          item
            ? `Switch ${contextLabels[kind]} from ${item.label}`
            : `Choose ${contextLabels[kind].toLowerCase()}`
        }
        onClick={onToggle}
      >
        <ContextButtonContent kind={kind} item={item} showChevron />
      </button>

      {open ? (
        <div
          className={switcherStyles.menu}
          role="menu"
          aria-label={`Switch ${contextLabels[kind]}`}
        >
          <span className={switcherStyles.menuLabel}>
            Switch {contextLabels[kind]}
          </span>
          <ContextOptionsContent
            state={state}
            onSelect={onSelect}
            onRetry={onRetry}
          />
        </div>
      ) : null}
    </div>
  )
}

export function AppShell({
  children,
  user,
  context,
  variant = 'default',
}: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [accountOpen, setAccountOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [switcherKind, setSwitcherKind] = useState<AppShellContextKind | null>(
    null,
  )
  const [contextOptions, setContextOptions] = useState<
    Partial<Record<AppShellContextKind, ContextOptionState>>
  >({})
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const contextItems = getContextItems(context)
  const activeContext = contextItems.at(-1)
  const displayName = user.displayName?.trim() || `@${user.username}`
  const background = uiAssets.backgrounds.appShell
  const contextMode = getContextMode(context)
  const identifiers = getContextIdentifiers(context, pathname)

  useEffect(() => {
    if (!accountOpen && !contextOpen && !switcherKind) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountOpen(false)
        setContextOpen(false)
        setSwitcherKind(null)
      }
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [accountOpen, contextOpen, switcherKind])

  function toggleAccount() {
    setContextOpen(false)
    setSwitcherKind(null)
    setAccountOpen((open) => !open)
    setSignOutError(null)
  }

  function toggleContext() {
    setAccountOpen(false)
    setSwitcherKind(null)
    setContextOpen((open) => !open)
  }

  async function loadContextOptions(kind: AppShellContextKind, force = false) {
    const existing = contextOptions[kind]
    if (
      !force &&
      (existing?.status === 'loading' || existing?.status === 'loaded')
    ) {
      return
    }

    setContextOptions((current) => ({
      ...current,
      [kind]: { status: 'loading' },
    }))

    try {
      const pageSearchParams = new URLSearchParams(window.location.search)
      const currentIdentifiers = getContextIdentifiers(
        context,
        pathname,
        pageSearchParams,
      )
      const params = new URLSearchParams({ kind })

      if (currentIdentifiers.worldId) {
        params.set('worldId', currentIdentifiers.worldId)
      }
      if (currentIdentifiers.campaignId) {
        params.set('campaignId', currentIdentifiers.campaignId)
      }
      if (currentIdentifiers.worldCharacterId) {
        params.set('worldCharacterId', currentIdentifiers.worldCharacterId)
      }

      const pageMode = pageSearchParams.get('mode')
      const mode =
        pageMode === 'weaver' || pageMode === 'threadwatcher'
          ? pageMode
          : contextMode
      if (mode) params.set('mode', mode)

      const response = await fetch(
        `/api/v1/navigation/context?${params.toString()}`,
        {
          credentials: 'same-origin',
          cache: 'no-store',
        },
      )
      if (!response.ok) throw new Error('Context navigation request failed.')

      const payload = (await response.json()) as {
        options?: ContextNavigationOption[]
      }
      if (!Array.isArray(payload.options)) {
        throw new Error('Context navigation response is invalid.')
      }

      setContextOptions((current) => ({
        ...current,
        [kind]: { status: 'loaded', options: payload.options ?? [] },
      }))
    } catch {
      setContextOptions((current) => ({
        ...current,
        [kind]: { status: 'error' },
      }))
    }
  }

  function toggleSwitcher(kind: AppShellContextKind) {
    setAccountOpen(false)
    const nextKind = switcherKind === kind ? null : kind
    setSwitcherKind(nextKind)
    if (nextKind) void loadContextOptions(nextKind, true)
  }

  function selectContextOption(
    event: ReactMouseEvent<HTMLAnchorElement>,
    option: ContextNavigationOption,
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    if (option.tracking) {
      void fetch('/api/v1/selection/use', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(option.tracking),
        keepalive: true,
      }).catch(() => undefined)
    }

    setSwitcherKind(null)
    setContextOpen(false)
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
          loading="eager"
          sizes="100vw"
          className={`${styles.backgroundImage} ${variant === 'launcher' ? styles.launcherBackgroundImage : ''}`}
        />
        <div
          className={`${styles.backgroundVeil} ${variant === 'launcher' ? styles.launcherBackgroundVeil : ''}`}
        />
      </div>

      <header
        className={`${styles.header} ${variant === 'launcher' ? styles.launcherHeader : ''}`}
      >
        <Link
          className={styles.brand}
          href="/select"
          aria-label="Weaveryn home"
        >
          <BrandLogo className={styles.brandLogo} />
          <BrandWordmark className={styles.brandWordmark} />
        </Link>

        {variant === 'launcher' ? (
          <span className={styles.launcherThread} aria-hidden="true" />
        ) : (
          <nav className={styles.desktopContext} aria-label="Current context">
            {switcherKind && !contextOpen ? (
              <button
                type="button"
                className={styles.dismissLayer}
                tabIndex={-1}
                aria-label="Close context switcher"
                onClick={() => setSwitcherKind(null)}
              />
            ) : null}
            <div className={styles.contextTrail}>
              {contextKinds.map((kind) => {
                const canSwitch = canSwitchContext(
                  kind,
                  identifiers,
                  contextMode,
                )
                return (
                  <div className={styles.contextTrailSlot} key={kind}>
                    <DesktopContextEntry
                      kind={kind}
                      item={context?.[kind]}
                      canSwitch={canSwitch}
                      open={switcherKind === kind}
                      state={contextOptions[kind] ?? { status: 'idle' }}
                      onToggle={() => toggleSwitcher(kind)}
                      onSelect={selectContextOption}
                      onRetry={() => void loadContextOptions(kind, true)}
                    />
                  </div>
                )
              })}
            </div>
          </nav>
        )}

        <button
          type="button"
          className={styles.mobileContextButton}
          aria-haspopup="dialog"
          aria-expanded={contextOpen}
          aria-controls="mobile-context-panel"
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
                    <span>@{user.username}</span>
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
            onClick={() => {
              setContextOpen(false)
              setSwitcherKind(null)
            }}
          />
          <section
            id="mobile-context-panel"
            className={switcherStyles.mobilePanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-context-title"
          >
            <div className={switcherStyles.mobileHeader}>
              <div>
                <span>Current context</span>
                <h2 id="mobile-context-title">
                  {activeContext?.label ?? 'Choose Entity'}
                </h2>
              </div>
              <button
                type="button"
                className={switcherStyles.mobileClose}
                aria-label="Close context selector"
                onClick={() => {
                  setContextOpen(false)
                  setSwitcherKind(null)
                }}
              >
                ×
              </button>
            </div>

            <div className={switcherStyles.mobileList}>
              {contextKinds.map((kind) => {
                const item = context?.[kind]
                const canSwitch = canSwitchContext(
                  kind,
                  identifiers,
                  contextMode,
                )
                const open = switcherKind === kind

                return (
                  <div
                    className={switcherStyles.mobileRow}
                    data-open={open ? 'true' : 'false'}
                    key={kind}
                  >
                    {canSwitch ? (
                      <button
                        type="button"
                        className={switcherStyles.mobileRowButton}
                        aria-expanded={open}
                        onClick={() => toggleSwitcher(kind)}
                      >
                        <span className={styles.contextGlyph}>
                          <ContextGlyph kind={kind} />
                        </span>
                        <span className={switcherStyles.mobileRowCopy}>
                          <small>{contextLabels[kind]}</small>
                          <strong>
                            {item?.label ?? `Choose ${contextLabels[kind]}`}
                          </strong>
                        </span>
                        <span
                          className={switcherStyles.mobileRowChevron}
                          aria-hidden="true"
                        >
                          ⌄
                        </span>
                      </button>
                    ) : (
                      <Link
                        className={switcherStyles.mobileRowButton}
                        href={item?.href ?? '/select'}
                        onClick={() => setContextOpen(false)}
                      >
                        <span className={styles.contextGlyph}>
                          <ContextGlyph kind={kind} />
                        </span>
                        <span className={switcherStyles.mobileRowCopy}>
                          <small>{contextLabels[kind]}</small>
                          <strong>
                            {item?.label ?? `Choose ${contextLabels[kind]}`}
                          </strong>
                        </span>
                      </Link>
                    )}

                    {open ? (
                      <div
                        className={switcherStyles.mobileOptions}
                        role="menu"
                        aria-label={`Switch ${contextLabels[kind]}`}
                      >
                        <ContextOptionsContent
                          state={contextOptions[kind] ?? { status: 'idle' }}
                          onSelect={selectContextOption}
                          onRetry={() => void loadContextOptions(kind, true)}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <Link
              className={switcherStyles.chooseEntity}
              href="/select"
              onClick={() => {
                setContextOpen(false)
                setSwitcherKind(null)
              }}
            >
              <span aria-hidden="true">◇</span>
              <span>
                <strong>Choose Entity</strong>
                <small>Return to the full entry selection</small>
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          </section>
        </>
      ) : null}
    </div>
  )
}
