'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { AppShellContext, AppShellContextKind } from './app-shell'
import styles from './in-app-navigation.module.css'

interface NavigationLink {
  label: string
  href: string
  meta?: string
}

const contextOrder: ReadonlyArray<AppShellContextKind> = [
  'world',
  'campaign',
  'character',
]

const contextLabels: Record<AppShellContextKind, string> = {
  world: 'World',
  campaign: 'Campaign',
  character: 'Character',
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

function withMode(path: string, mode: ReturnType<typeof inferMode>) {
  if (!mode) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}mode=${mode}`
}

export function buildInAppNavigation(context?: AppShellContext) {
  const mode = inferMode(context)
  const worldId =
    context?.world?.id ?? contextIdFromHref(context?.world?.href, 'world')
  const campaignId =
    context?.campaign?.id ??
    contextIdFromHref(context?.campaign?.href, 'campaign')

  const breadcrumbs = contextOrder.flatMap((kind) => {
    const item = context?.[kind]
    if (!item?.href) return []
    return [
      {
        kind,
        label: item.label,
        href: item.href,
      },
    ]
  })

  const worldLinks: NavigationLink[] = []
  if (worldId) {
    worldLinks.push(
      {
        label: 'World overview',
        href: context?.world?.href ?? withMode(`/world/${worldId}`, mode),
      },
      {
        label: 'Entities',
        href: withMode(`/world/${worldId}/entities`, mode),
      },
      {
        label: 'Timeline',
        href: withMode(`/world/${worldId}/timeline`, mode),
      },
    )
  }

  const campaignLinks: NavigationLink[] = []
  if (worldId && campaignId) {
    campaignLinks.push({
      label: 'Campaign overview',
      href:
        context?.campaign?.href ??
        withMode(`/world/${worldId}/campaign/${campaignId}`, mode),
    })
  }

  const characterLinks: NavigationLink[] = []
  if (context?.character?.href) {
    characterLinks.push({
      label: 'Character profile',
      href: context.character.href,
    })
  }
  characterLinks.push({
    label: 'Manage my Characters',
    href: '/select/manage-characters',
  })

  return {
    breadcrumbs,
    sections: [
      ...(worldLinks.length > 0
        ? [{ label: 'World', links: worldLinks }]
        : []),
      ...(campaignLinks.length > 0
        ? [{ label: 'Campaign', links: campaignLinks }]
        : []),
      { label: 'Characters', links: characterLinks },
    ],
  }
}

export function InAppNavigation({ context }: { context?: AppShellContext }) {
  const [open, setOpen] = useState(false)
  const navigation = useMemo(() => buildInAppNavigation(context), [context])

  useEffect(() => {
    if (!open) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <>
      <div className={styles.bar} aria-label="In-app navigation">
        <button
          type="button"
          className={styles.menuButton}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="in-app-navigation-drawer"
          onClick={() => setOpen(true)}
        >
          <span className={styles.hamburger} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className={styles.menuLabel}>Navigate</span>
        </button>

        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/select" className={styles.breadcrumbRoot}>
            The Weave
          </Link>
          {navigation.breadcrumbs.map((item, index) => (
            <span className={styles.breadcrumbItem} key={`${item.kind}:${item.href}`}>
              <span className={styles.separator} aria-hidden="true">
                ›
              </span>
              <Link
                href={item.href}
                aria-current={
                  index === navigation.breadcrumbs.length - 1 ? 'page' : undefined
                }
              >
                <small>{contextLabels[item.kind]}</small>
                <strong>{item.label}</strong>
              </Link>
            </span>
          ))}
        </nav>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <aside
            id="in-app-navigation-drawer"
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="in-app-navigation-title"
          >
            <header className={styles.drawerHeader}>
              <div>
                <span>Navigate the Weave</span>
                <h2 id="in-app-navigation-title">Current workspace</h2>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>

            {navigation.breadcrumbs.length > 0 ? (
              <div className={styles.currentPath}>
                <span>Current path</span>
                {navigation.breadcrumbs.map((item) => (
                  <Link
                    href={item.href}
                    key={`drawer:${item.kind}:${item.href}`}
                    onClick={() => setOpen(false)}
                  >
                    <small>{contextLabels[item.kind]}</small>
                    <strong>{item.label}</strong>
                  </Link>
                ))}
              </div>
            ) : null}

            <div className={styles.sections}>
              {navigation.sections.map((section) => (
                <section className={styles.section} key={section.label}>
                  <h3>{section.label}</h3>
                  <div className={styles.links}>
                    {section.links.map((link) => (
                      <Link
                        href={link.href}
                        key={`${section.label}:${link.href}:${link.label}`}
                        onClick={() => setOpen(false)}
                      >
                        <span>
                          <strong>{link.label}</strong>
                          {link.meta ? <small>{link.meta}</small> : null}
                        </span>
                        <span aria-hidden="true">›</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className={styles.drawerFooter}>
              <Link href="/select" onClick={() => setOpen(false)}>
                <span aria-hidden="true">◇</span>
                <span>
                  <strong>Choose Entity</strong>
                  <small>Return to the full launcher</small>
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            </div>
          </aside>
        </>
      ) : null}
    </>
  )
}
