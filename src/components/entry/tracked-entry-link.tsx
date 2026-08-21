'use client'

import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'

type EntryTracking =
  | {
      kind: 'CHARACTER'
      worldCharacterId: string
      campaignId?: string | null
    }
  | {
      kind: 'PORTABLE_CHARACTER'
      characterId: string
    }
  | {
      kind: 'WEAVER'
      worldId: string
      campaignId?: string | null
    }

export function TrackedEntryLink({
  href,
  className,
  children,
  tracking,
  ariaLabel,
  style,
}: {
  href: string
  className?: string
  children: ReactNode
  tracking?: EntryTracking
  ariaLabel?: string
  style?: CSSProperties
}) {
  function recordUse() {
    if (!tracking) return

    void fetch('/api/v1/selection/use', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tracking),
      keepalive: true,
    }).catch(() => undefined)
  }

  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      style={style}
      onClick={(event) => {
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
        recordUse()
      }}
    >
      {children}
    </Link>
  )
}
