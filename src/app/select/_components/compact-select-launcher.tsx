'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLayoutEffect, useRef, useState } from 'react'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { uiAssets } from '@/lib/ui-assets'
import {
  LauncherCharacterBrowser,
  type LauncherCharacterSortMode,
} from './launcher-character-browser'
import { PinEntryButton } from './pin-entry-button'
import { SelectBackgroundParticles } from './select-background-particles'
import { SelectLogoutButton } from './select-logout-button'
import styles from './compact-select-launcher.module.css'
import polishStyles from './compact-select-launcher-polish.module.css'
import scaleStyles from './compact-select-launcher-scale.module.css'
import browserStyles from './launcher-character-browser.module.css'

const DESKTOP_COMPOSITION_WIDTH = 2560
const DESKTOP_COMPOSITION_HEIGHT = 1276

type LauncherTracking =
  | {
      kind: 'CHARACTER'
      worldCharacterId: string
      campaignId?: string | null
    }
  | {
      kind: 'PORTABLE_CHARACTER'
      characterId: string
    }

type WeaverTracking = {
  kind: 'WEAVER'
  worldId: string
  campaignId?: string | null
}

type LauncherPinTarget =
  | {
      worldCharacterId: string
      campaignId?: string | null
      characterId?: never
    }
  | {
      characterId: string
      worldCharacterId?: never
      campaignId?: never
    }

export interface CompactLauncherEntry {
  kind: 'world' | 'portable'
  key: string
  name: string
  image: string
  heroSrc: string
  heroIsPortraitFallback: boolean
  worldId: string | null
  worldName: string
  campaignName: string | null
  href: string
  actionLabel: string
  pinned: boolean
  pinTarget: LauncherPinTarget
  tracking: LauncherTracking
}

interface PendingCampaign {
  id: string
  name: string
  href: string
}

export function CompactSelectLauncher({
  entries,
  browserEntries,
  initialSelectedKey,
  initialBrowserOpen,
  initialBrowserQuery,
  initialBrowserWorld,
  initialBrowserSort,
  hasMoreCharacters,
  pendingCampaigns,
  weaverHref,
  weaverTracking,
  weaverContext,
}: {
  entries: CompactLauncherEntry[]
  browserEntries: CompactLauncherEntry[]
  initialSelectedKey?: string
  initialBrowserOpen: boolean
  initialBrowserQuery: string
  initialBrowserWorld: string
  initialBrowserSort: LauncherCharacterSortMode
  hasMoreCharacters: boolean
  pendingCampaigns: PendingCampaign[]
  weaverHref: string
  weaverTracking?: WeaverTracking
  weaverContext: string | null
}) {
  const stageRef = useRef<HTMLElement>(null)
  const compositionRef = useRef<HTMLDivElement>(null)
  const [selectedKey, setSelectedKey] = useState(
    initialSelectedKey ?? entries[0]?.key ?? null,
  )
  const [browserOpen, setBrowserOpen] = useState(initialBrowserOpen)
  const selectedEntry =
    browserEntries.find((entry) => entry.key === selectedKey) ??
    entries[0] ??
    null
  const launcherEntries =
    selectedEntry && !entries.some((entry) => entry.key === selectedEntry.key)
      ? [selectedEntry, ...entries.slice(0, 2)]
      : entries

  useLayoutEffect(() => {
    const stage = stageRef.current
    const composition = compositionRef.current
    if (!stage || !composition) return

    const updateCompositionScale = () => {
      const { width, height } = stage.getBoundingClientRect()
      if (width <= 0 || height <= 0) return

      const scale = Math.min(
        width / DESKTOP_COMPOSITION_WIDTH,
        height / DESKTOP_COMPOSITION_HEIGHT,
      )
      composition.style.setProperty('--launcher-scale', String(scale))
    }

    updateCompositionScale()
    window.addEventListener('resize', updateCompositionScale)

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateCompositionScale)
    resizeObserver?.observe(stage)

    return () => {
      window.removeEventListener('resize', updateCompositionScale)
      resizeObserver?.disconnect()
    }
  }, [])

  return (
    <section
      ref={stageRef}
      className={`${styles.stage} ${polishStyles.stage} ${scaleStyles.stage} ${browserOpen ? browserStyles.browserStage : ''}`}
      data-screen={browserOpen ? 'browser' : 'launcher'}
      aria-label="Choose how to enter Weaveryn"
    >
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
      <SelectLogoutButton />

      <div ref={compositionRef} className={scaleStyles.desktopComposition}>
        {browserOpen ? (
          <LauncherCharacterBrowser
            entries={browserEntries}
            selectedKey={selectedEntry?.key ?? null}
            initialQuery={initialBrowserQuery}
            initialWorld={initialBrowserWorld}
            initialSort={initialBrowserSort}
            onBack={() => setBrowserOpen(false)}
            onSelect={(key) => {
              setSelectedKey(key)
              setBrowserOpen(false)
            }}
          />
        ) : (
          <>
            {selectedEntry ? (
              <div
                className={`${styles.heroArtwork} ${polishStyles.heroArtwork} ${scaleStyles.heroArtwork} ${
                  selectedEntry.heroIsPortraitFallback
                    ? `${styles.heroPortraitFallback} ${polishStyles.heroPortraitFallback}`
                    : ''
                }`}
                aria-hidden="true"
              >
                <Image
                  src={selectedEntry.heroSrc}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 760px) 80vw, 38vw"
                  className={`${styles.heroImage} ${polishStyles.heroImage}`}
                />
              </div>
            ) : null}

            <div
              className={`${styles.selectorPanel} ${scaleStyles.selectorPanel}`}
            >
              <div className={styles.crest} aria-hidden="true">
                <Image
                  src={uiAssets.brand.logo.src}
                  alt=""
                  fill
                  sizes="120px"
                  className={styles.crestImage}
                />
              </div>

              {launcherEntries.length > 0 ? (
                <div className={styles.characterRows}>
                  {launcherEntries.map((entry) => {
                    const selected = entry.key === selectedEntry?.key
                    return (
                      <div
                        className={styles.rowShell}
                        data-selected={selected ? 'true' : 'false'}
                        key={entry.key}
                      >
                        <button
                          type="button"
                          className={`${styles.rowSelect} ${polishStyles.rowSelect}`}
                          aria-pressed={selected}
                          aria-label={`Select ${entry.name}`}
                          onClick={() => setSelectedKey(entry.key)}
                        >
                          <span className={styles.portrait} aria-hidden="true">
                            <Image
                              src={entry.image}
                              alt=""
                              fill
                              sizes="96px"
                              className={styles.portraitImage}
                            />
                            <Image
                              src={uiAssets.ui.frames.goldCircle}
                              alt=""
                              fill
                              sizes="100px"
                              className={styles.portraitFrame}
                            />
                          </span>

                          <span className={styles.rowCopy}>
                            <strong className={styles.rowName}>
                              {entry.name}
                            </strong>
                            <span className={styles.rowMeta}>
                              {entry.worldName}
                            </span>
                            <span className={styles.rowCampaign}>
                              {entry.campaignName
                                ? `Campaign: ${entry.campaignName}`
                                : entry.kind === 'portable'
                                  ? 'Ready to join a World'
                                  : 'No active Campaign'}
                            </span>
                          </span>

                          <Image
                            src={uiAssets.ui.frames.goldRect}
                            alt=""
                            fill
                            sizes="590px"
                            className={styles.rowFrame}
                          />
                        </button>

                        <PinEntryButton
                          pinned={entry.pinned}
                          className={`${styles.favoriteButton} ${polishStyles.favoriteButton}`}
                          {...entry.pinTarget}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className={styles.emptyRows}>
                  <strong>No Character entries yet</strong>
                  <span>Create a Character or join a Campaign to begin.</span>
                </div>
              )}

              {hasMoreCharacters ? (
                <button
                  type="button"
                  className={`${styles.browseLink} ${browserStyles.browseTrigger}`}
                  onClick={() => setBrowserOpen(true)}
                >
                  Browse all characters <span aria-hidden="true">›</span>
                </button>
              ) : null}

              {selectedEntry ? (
                <TrackedEntryLink
                  href={selectedEntry.href}
                  className={`${styles.primaryAction} ${polishStyles.primaryAction} ${scaleStyles.primaryAction}`}
                  tracking={selectedEntry.tracking}
                  ariaLabel={`${selectedEntry.actionLabel} as ${selectedEntry.name}`}
                >
                  <Image
                    src={uiAssets.ui.frames.goldPrimaryAction}
                    alt=""
                    fill
                    sizes="590px"
                    className={styles.primaryFrame}
                  />
                  <span>{selectedEntry.actionLabel}</span>
                </TrackedEntryLink>
              ) : (
                <Link
                  className={`${styles.primaryAction} ${polishStyles.primaryAction} ${scaleStyles.primaryAction}`}
                  href="/select/create-character"
                >
                  <Image
                    src={uiAssets.ui.frames.goldPrimaryAction}
                    alt=""
                    fill
                    sizes="590px"
                    className={styles.primaryFrame}
                  />
                  <span>Create Character</span>
                </Link>
              )}

              <div className={styles.roleHeading}>
                <span>Other ways to enter</span>
              </div>

              <div className={styles.roleActions}>
                <TrackedEntryLink
                  href={weaverHref}
                  className={`${styles.roleButton} ${polishStyles.roleButton}`}
                  tracking={weaverTracking}
                  ariaLabel={
                    weaverContext
                      ? `Enter as Weaver and resume ${weaverContext}`
                      : 'Enter as Weaver'
                  }
                >
                  <Image
                    src={uiAssets.ui.frames.goldRect}
                    alt=""
                    fill
                    sizes="290px"
                    className={styles.roleFrame}
                  />
                  <span>Enter as Weaver</span>
                </TrackedEntryLink>

                <Link
                  className={`${styles.roleButton} ${polishStyles.roleButton}`}
                  href="/world?mode=threadwatcher"
                >
                  <Image
                    src={uiAssets.ui.frames.goldRect}
                    alt=""
                    fill
                    sizes="290px"
                    className={styles.roleFrame}
                  />
                  <span>Enter as Threadwatcher</span>
                </Link>
              </div>

              {pendingCampaigns.length > 0 ? (
                <div className={styles.pendingCampaigns}>
                  <span>Waiting for a Character</span>
                  {pendingCampaigns.map((campaign) => (
                    <Link href={campaign.href} key={campaign.id}>
                      {campaign.name} ›
                    </Link>
                  ))}
                </div>
              ) : null}

              <nav
                className={styles.utilityLinks}
                aria-label="Character utilities"
              >
                <Link href="/select/create-character">Create character</Link>
                <Link href="/select/join">Join with invite</Link>
                <Link href="/character">Manage characters</Link>
              </nav>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
