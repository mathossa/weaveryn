'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import type { AppShellContext, AppShellContextKind } from './app-shell'
import styles from './in-app-navigation.module.css'

interface NavigationLink {
  label: string
  href?: string
  match?: 'exact' | 'prefix'
}

interface NavigationSection {
  label: string
  links: NavigationLink[]
}

let carryNavigationOpen = false
const navigationStateListeners = new Set<() => void>()

function subscribeNavigationState(listener: () => void) {
  navigationStateListeners.add(listener)
  return () => navigationStateListeners.delete(listener)
}

function navigationStateSnapshot() {
  return carryNavigationOpen
}

function navigationServerSnapshot() {
  return false
}

function setCarryNavigationOpen(open: boolean) {
  if (carryNavigationOpen === open) return
  carryNavigationOpen = open
  navigationStateListeners.forEach((listener) => listener())
}

function useCarryNavigationOpen() {
  return useSyncExternalStore(
    subscribeNavigationState,
    navigationStateSnapshot,
    navigationServerSnapshot,
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

function inferMode(context?: AppShellContext) {
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

function withWorkspaceContext(
  href: string,
  input: {
    mode: ReturnType<typeof inferMode>
    campaignId?: string
    worldCharacterId?: string
  },
) {
  const [hrefWithoutHash, hash] = href.split('#', 2)
  const [pathname, rawQuery] = hrefWithoutHash.split('?', 2)
  const params = new URLSearchParams(rawQuery ?? '')

  if (input.mode) {
    params.set('mode', input.mode)
    // Campaign navigation context is independent of the active entry mode.
    if (input.mode === 'weaver' && input.campaignId) {
      params.set('campaign', input.campaignId)
    } else {
      params.delete('campaign')
    }
    params.delete('character')
  } else {
    if (input.campaignId) params.set('campaign', input.campaignId)
    if (input.worldCharacterId) {
      params.set('character', input.worldCharacterId)
    }
  }

  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`
}

function worldPath(
  worldId: string | undefined,
  suffix: string,
  input: Parameters<typeof withWorkspaceContext>[1],
) {
  if (!worldId) return undefined
  return withWorkspaceContext(`/world/${worldId}${suffix}`, input)
}

function pathFromHref(href: string) {
  return href.split(/[?#]/)[0] ?? href
}

function isActivePath(
  pathname: string,
  href: string | undefined,
  match: NavigationLink['match'] = 'exact',
) {
  if (!href) return false
  const target = pathFromHref(href)
  if (match === 'prefix') {
    return pathname === target || pathname.startsWith(`${target}/`)
  }
  return pathname === target
}

export function buildInAppNavigation(context?: AppShellContext) {
  const mode = inferMode(context)
  const worldId =
    context?.world?.id ?? contextIdFromHref(context?.world?.href, 'world')
  const campaignId =
    context?.campaign?.id ??
    contextIdFromHref(context?.campaign?.href, 'campaign')
  const worldCharacterId =
    context?.character?.id ??
    contextIdFromHref(context?.character?.href, 'character')
  const workspaceContext = { mode, campaignId, worldCharacterId }

  let worldOverview = context?.world?.href
  if (!worldOverview && worldId) {
    worldOverview = `/world/${worldId}`
  }
  if (worldOverview) {
    worldOverview = withWorkspaceContext(worldOverview, workspaceContext)
  }

  let campaignOverview = context?.campaign?.href
  if (!campaignOverview && worldId && campaignId) {
    campaignOverview = `/world/${worldId}/campaign/${campaignId}`
  }
  if (campaignOverview) {
    campaignOverview = withWorkspaceContext(campaignOverview, workspaceContext)
  }

  const sections: NavigationSection[] = [
    {
      label: 'World',
      links: [
        { label: 'Overview', href: worldOverview },
        {
          label: 'Entities',
          href: worldPath(worldId, '/entities', workspaceContext),
          match: 'prefix',
        },
        {
          label: 'Timeline',
          href: worldPath(worldId, '/timeline', workspaceContext),
          match: 'prefix',
        },
      ],
    },
    {
      label: 'Campaign',
      links: [
        {
          label: 'Overview',
          href: campaignOverview,
          match: 'prefix',
        },
      ],
    },
    {
      label: 'Character',
      links: [
        {
          label: 'Profile',
          href: context?.character?.href,
          match: 'prefix',
        },
      ],
    },
  ]

  return { sections }
}

export function InAppNavigationToggle({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  const carriedOpen = useCarryNavigationOpen()
  const effectiveOpen = open || carriedOpen

  function toggleNavigation() {
    if (carriedOpen && !open) {
      setCarryNavigationOpen(false)
      return
    }

    if (open) setCarryNavigationOpen(false)
    onToggle()
  }

  return (
    <button
      type="button"
      className={styles.toggleButton}
      data-open={effectiveOpen ? 'true' : 'false'}
      aria-expanded={effectiveOpen}
      aria-controls="in-app-navigation-drawer"
      aria-label={effectiveOpen ? 'Close navigation' : 'Open navigation'}
      onClick={toggleNavigation}
    >
      <span className={styles.hamburger} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </button>
  )
}

export function InAppNavigationWorkspace({
  children,
  context,
  open,
  onClose,
}: {
  children: ReactNode
  context?: AppShellContext
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const navigation = useMemo(() => buildInAppNavigation(context), [context])
  const carriedOpen = useCarryNavigationOpen()
  const effectiveOpen = open || carriedOpen

  function closeNavigation() {
    setCarryNavigationOpen(false)
    onClose()
  }

  useEffect(() => {
    if (!carriedOpen || open) return

    function closeCarriedNavigationOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeNavigation()
    }

    document.addEventListener('keydown', closeCarriedNavigationOnEscape)
    return () =>
      document.removeEventListener('keydown', closeCarriedNavigationOnEscape)
  })

  return (
    <div
      className={styles.workspace}
      data-open={effectiveOpen ? 'true' : 'false'}
    >
      <aside
        id="in-app-navigation-drawer"
        className={styles.drawer}
        aria-label="Application navigation"
        aria-hidden={!effectiveOpen}
      >
        <div className={styles.drawerInner}>
          <nav className={styles.sections} aria-label="Navigation">
            {navigation.sections.map((section) => (
              <section className={styles.section} key={section.label}>
                <h3>{section.label}</h3>
                <div className={styles.links}>
                  {section.links.map((link) => {
                    const active = isActivePath(pathname, link.href, link.match)

                    if (!link.href) {
                      return (
                        <span
                          className={`${styles.navLink} ${styles.disabledLink}`}
                          aria-disabled="true"
                          key={`${section.label}:${link.label}`}
                        >
                          <span>{link.label}</span>
                        </span>
                      )
                    }

                    return (
                      <Link
                        className={styles.navLink}
                        data-active={active ? 'true' : 'false'}
                        href={link.href}
                        key={`${section.label}:${link.href}:${link.label}`}
                        tabIndex={effectiveOpen ? undefined : -1}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setCarryNavigationOpen(true)}
                      >
                        <span>{link.label}</span>
                        <span aria-hidden="true">›</span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </nav>

          <div className={styles.drawerFooter}>
            <Link
              href="/select"
              tabIndex={effectiveOpen ? undefined : -1}
              onClick={() => setCarryNavigationOpen(false)}
            >
              <span aria-hidden="true">◇</span>
              <span>
                <strong>Return to the Weave</strong>
              </span>
            </Link>
          </div>
        </div>
      </aside>

      <div className={styles.viewport}>{children}</div>
    </div>
  )
}
