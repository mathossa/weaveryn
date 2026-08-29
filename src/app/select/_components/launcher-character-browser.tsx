'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { uiAssets } from '@/lib/ui-assets'
import type { CompactLauncherEntry } from './compact-select-launcher'
import { PinEntryButton } from './pin-entry-button'
import styles from './launcher-character-browser.module.css'

export type LauncherCharacterSortMode = 'recent' | 'alphabetical'

export function LauncherCharacterBrowser({
  entries,
  selectedKey,
  initialQuery,
  initialWorld,
  initialSort,
  onBack,
  onSelect,
}: {
  entries: CompactLauncherEntry[]
  selectedKey: string | null
  initialQuery: string
  initialWorld: string
  initialSort: LauncherCharacterSortMode
  onBack: () => void
  onSelect: (key: string) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [world, setWorld] = useState(initialWorld)
  const [sort, setSort] = useState(initialSort)

  const worldChoices = useMemo(() => {
    const choices = new Map<string, string>()
    for (const entry of entries) {
      if (entry.worldId) choices.set(entry.worldId, entry.worldName)
    }
    return Array.from(choices, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [entries])

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const filtered = entries.filter((entry) => {
      if (world && entry.worldId !== world) return false
      if (!normalizedQuery) return true

      return [
        entry.name,
        entry.worldName,
        entry.campaignName ?? '',
        entry.kind === 'portable' ? 'portable character' : '',
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
    })

    if (sort === 'alphabetical') {
      return [...filtered].sort((left, right) => {
        const nameDifference = left.name.localeCompare(right.name, undefined, {
          sensitivity: 'base',
        })
        if (nameDifference !== 0) return nameDifference

        const worldDifference = left.worldName.localeCompare(
          right.worldName,
          undefined,
          { sensitivity: 'base' },
        )
        if (worldDifference !== 0) return worldDifference

        return (left.campaignName ?? '').localeCompare(
          right.campaignName ?? '',
          undefined,
          { sensitivity: 'base' },
        )
      })
    }

    return filtered
  }, [entries, query, sort, world])

  const hasFilters = Boolean(query.trim() || world)

  return (
    <section className={styles.browserScreen} aria-label="Browse all characters">
      <div className={styles.browserFrame}>
        <header className={styles.browserHeader}>
          <button type="button" className={styles.backButton} onClick={onBack}>
            <span aria-hidden="true">‹</span>
            Return to launcher
          </button>

          <div className={styles.crest} aria-hidden="true">
            <Image
              src={uiAssets.brand.logo.src}
              alt=""
              fill
              sizes="96px"
              className={styles.crestImage}
            />
          </div>

          <div className={styles.entryCount}>
            <strong>{filteredEntries.length}</strong>
            <span>{filteredEntries.length === 1 ? 'entry' : 'entries'} shown</span>
          </div>
        </header>

        <div className={styles.browserIntro}>
          <span className={styles.eyebrow}>The woven paths</span>
          <h1>Choose a character</h1>
          <p>
            Search every available character entry, then return to the launcher
            before entering a Campaign.
          </p>
        </div>

        <div className={styles.browserControls}>
          <label className={`${styles.control} ${styles.searchControl}`}>
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Character, World, or Campaign"
            />
          </label>

          <label className={styles.control}>
            <span>World</span>
            <select value={world} onChange={(event) => setWorld(event.target.value)}>
              <option value="">All Worlds</option>
              {worldChoices.map((choice) => (
                <option value={choice.id} key={choice.id}>
                  {choice.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.control}>
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) => {
                const nextSort = event.target.value as LauncherCharacterSortMode
                setSort(nextSort)
                document.cookie = `weaveryn-character-sort=${nextSort}; Path=/; Max-Age=31536000; SameSite=Lax`
              }}
            >
              <option value="recent">Recent &amp; pinned</option>
              <option value="alphabetical">Alphabetical (A–Z)</option>
            </select>
          </label>

          {hasFilters ? (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => {
                setQuery('')
                setWorld('')
              }}
            >
              Clear filters
            </button>
          ) : (
            <span className={styles.clearSpacer} aria-hidden="true" />
          )}
        </div>

        <div className={styles.characterViewport}>
          {filteredEntries.length > 0 ? (
            <div className={styles.characterGrid}>
              {filteredEntries.map((entry) => {
                const selected = entry.key === selectedKey
                return (
                  <div
                    className={styles.characterCard}
                    data-selected={selected ? 'true' : 'false'}
                    key={entry.key}
                  >
                    <button
                      type="button"
                      className={styles.characterSelect}
                      aria-pressed={selected}
                      aria-label={`Select ${entry.name} from ${entry.worldName}${
                        entry.campaignName ? `, Campaign ${entry.campaignName}` : ''
                      }`}
                      onClick={() => onSelect(entry.key)}
                    >
                      <span className={styles.portrait} aria-hidden="true">
                        <Image
                          src={entry.image}
                          alt=""
                          fill
                          sizes="104px"
                          className={styles.portraitImage}
                        />
                        <Image
                          src={uiAssets.ui.frames.goldCircle}
                          alt=""
                          fill
                          sizes="110px"
                          className={styles.portraitFrame}
                        />
                      </span>

                      <span className={styles.characterCopy}>
                        <strong>{entry.name}</strong>
                        <span className={styles.worldName}>{entry.worldName}</span>
                        <span className={styles.campaignName}>
                          {entry.campaignName
                            ? `Campaign: ${entry.campaignName}`
                            : entry.kind === 'portable'
                              ? 'Portable · Ready to join a World'
                              : 'No active Campaign'}
                        </span>
                      </span>

                      <span className={styles.selectHint}>
                        {selected ? 'Selected' : 'Choose'}
                      </span>
                    </button>

                    <PinEntryButton
                      pinned={entry.pinned}
                      className={styles.pinButton}
                      {...entry.pinTarget}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>No paths found</strong>
              <span>Try another Character, World, or Campaign search.</span>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setWorld('')
                  }}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
