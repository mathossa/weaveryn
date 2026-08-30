'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import campaignStyles from '../[worldId]/campaign/weaver-campaign-selector.module.css'
import worldStyles from '../weaver-world-selector.module.css'
import styles from './cinematic-entry-browser.module.css'

type WeaverTracking = {
  kind: 'WEAVER'
  worldId: string
  campaignId?: string | null
}

type BrowserSortMode = 'recent' | 'az' | 'za'

export interface CinematicBrowserEntry {
  id: string
  name: string
  kicker: string
  meta: string
  href: string
  backgroundImage: string
  filterValue: string
  lastUsedAt?: string | null
  favorite?: boolean
  tracking?: WeaverTracking
}

interface CinematicEntryBrowserProps {
  kind: 'world' | 'campaign'
  roleLabel: 'Weaver' | 'Threadwatcher'
  entries: CinematicBrowserEntry[]
  closeHref: string
  favoritesEnabled?: boolean
  initialSort?: BrowserSortMode
}

export function CinematicEntryBrowser({
  kind,
  roleLabel,
  entries,
  closeHref,
  favoritesEnabled = false,
  initialSort = 'az',
}: CinematicEntryBrowserProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [favoriteFilter, setFavoriteFilter] = useState<'all' | 'favorites'>(
    'all',
  )
  const [sort, setSort] = useState<BrowserSortMode>(initialSort)

  const filterOptions = useMemo(() => {
    if (kind === 'world') {
      return [
        { value: 'all', label: 'All Worlds' },
        { value: 'standard', label: 'Standard Worlds' },
        { value: 'orphaned', label: 'Orphaned Worlds' },
      ]
    }

    return [
      { value: 'all', label: 'All statuses' },
      { value: 'ACTIVE', label: 'Active' },
      { value: 'ENDED', label: 'Ended' },
      { value: 'ARCHIVED', label: 'Archived' },
    ]
  }, [kind])

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()

    return entries
      .filter((entry) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          entry.name.toLocaleLowerCase().includes(normalizedQuery) ||
          entry.meta.toLocaleLowerCase().includes(normalizedQuery)
        const matchesFilter = filter === 'all' || entry.filterValue === filter
        const matchesFavorite =
          !favoritesEnabled ||
          favoriteFilter === 'all' ||
          Boolean(entry.favorite)
        return matchesQuery && matchesFilter && matchesFavorite
      })
      .sort((left, right) => {
        if (sort === 'recent') {
          const leftRecent = left.lastUsedAt
            ? Date.parse(left.lastUsedAt)
            : 0
          const rightRecent = right.lastUsedAt
            ? Date.parse(right.lastUsedAt)
            : 0
          if (leftRecent !== rightRecent) return rightRecent - leftRecent
        }

        const comparison = left.name.localeCompare(right.name, undefined, {
          sensitivity: 'base',
        })
        return sort === 'za' ? -comparison : comparison
      })
  }, [entries, favoriteFilter, favoritesEnabled, filter, query, sort])

  const cardStyles = kind === 'world' ? worldStyles : campaignStyles
  const gridClass =
    kind === 'world' ? worldStyles.worldGrid : campaignStyles.campaignGrid
  const cardClass =
    kind === 'world' ? worldStyles.worldCard : campaignStyles.campaignCard
  const actionLabel =
    kind === 'world' ? 'Choose Campaign' : `Enter as ${roleLabel}`

  return (
    <div className={styles.browserShell}>
      <section
        className={styles.browserPanel}
        aria-label={`Browse all ${kind === 'world' ? 'Worlds' : 'Campaigns'}`}
      >
        <div className={styles.browserHeader}>
          <div>
            <span className={styles.eyebrow}>Enter as {roleLabel}</span>
            <h1>Browse {kind === 'world' ? 'Worlds' : 'Campaigns'}</h1>
            <p>
              Search and filter every {kind === 'world' ? 'World' : 'Campaign'}
              available for this entry path.
            </p>
          </div>
          <Link
            className={styles.closeButton}
            href={closeHref}
            aria-label="Close browser"
          >
            <span aria-hidden="true">×</span>
          </Link>
        </div>

        <div
          className={styles.controls}
          data-favorites={favoritesEnabled ? 'true' : 'false'}
        >
          <label className={styles.control}>
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${kind === 'world' ? 'Worlds' : 'Campaigns'}…`}
            />
          </label>

          <label className={styles.control}>
            <span>{kind === 'world' ? 'Type' : 'Status'}</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {favoritesEnabled ? (
            <label className={styles.control}>
              <span>Favorites</span>
              <select
                value={favoriteFilter}
                onChange={(event) =>
                  setFavoriteFilter(
                    event.target.value as 'all' | 'favorites',
                  )
                }
              >
                <option value="all">All entries</option>
                <option value="favorites">Favorites only</option>
              </select>
            </label>
          ) : null}

          <label className={styles.control}>
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as BrowserSortMode)
              }
            >
              <option value="recent">Most recent</option>
              <option value="az">Name A–Z</option>
              <option value="za">Name Z–A</option>
            </select>
          </label>
        </div>

        <div className={styles.resultsMeta} aria-live="polite">
          {visibleEntries.length} of {entries.length}{' '}
          {kind === 'world' ? 'Worlds' : 'Campaigns'}
        </div>

        <div className={styles.scrollRegion}>
          {visibleEntries.length === 0 ? (
            <div className={styles.noResults}>
              <strong>
                No matching {kind === 'world' ? 'Worlds' : 'Campaigns'}
              </strong>
              <span>Try changing the search or filters.</span>
            </div>
          ) : (
            <div className={`${gridClass} ${styles.browserGrid}`}>
              {visibleEntries.map((entry) => (
                <TrackedEntryLink
                  key={entry.id}
                  className={cardClass}
                  href={entry.href}
                  tracking={entry.tracking}
                  style={{
                    backgroundImage: `url(${entry.backgroundImage})`,
                    minHeight: kind === 'world' ? '18rem' : '17rem',
                  }}
                >
                  <span className={cardStyles.cardCopy}>
                    <span className={cardStyles.cardKicker}>
                      {entry.kicker}
                    </span>
                    <strong>{entry.name}</strong>
                    <span className={cardStyles.meta}>{entry.meta}</span>
                    <span className={cardStyles.cardAction}>
                      <span>{actionLabel}</span>
                      <span aria-hidden="true">›</span>
                    </span>
                  </span>
                </TrackedEntryLink>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
