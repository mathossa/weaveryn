'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { uiAssets } from '@/lib/ui-assets'
import { PinEntryButton } from './pin-entry-button'
import styles from './compact-select-launcher.module.css'

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
  initialSelectedKey,
  hasMoreCharacters,
  pendingCampaigns,
  weaverHref,
  weaverTracking,
  weaverContext,
}: {
  entries: CompactLauncherEntry[]
  initialSelectedKey?: string
  hasMoreCharacters: boolean
  pendingCampaigns: PendingCampaign[]
  weaverHref: string
  weaverTracking?: WeaverTracking
  weaverContext: string | null
}) {
  const [selectedKey, setSelectedKey] = useState(
    initialSelectedKey ?? entries[0]?.key ?? null,
  )
  const selectedEntry =
    entries.find((entry) => entry.key === selectedKey) ?? entries[0] ?? null

  return (
    <section className={styles.stage} aria-label="Choose how to enter Weaveryn">
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

      {selectedEntry ? (
        <div
          className={`${styles.heroArtwork} ${selectedEntry.heroIsPortraitFallback ? styles.heroPortraitFallback : ''}`}
          aria-hidden="true"
        >
          <Image
            src={selectedEntry.heroSrc}
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 80vw, 38vw"
            className={styles.heroImage}
          />
        </div>
      ) : null}

      <div className={styles.selectorPanel}>
        <div className={styles.crest} aria-hidden="true">
          <Image
            src={uiAssets.brand.logo.src}
            alt=""
            fill
            sizes="88px"
            className={styles.crestImage}
          />
        </div>

        {entries.length > 0 ? (
          <div className={styles.characterRows}>
            {entries.map((entry) => {
              const selected = entry.key === selectedEntry?.key
              return (
                <div
                  className={styles.rowShell}
                  data-selected={selected ? 'true' : 'false'}
                  key={entry.key}
                >
                  <button
                    type="button"
                    className={styles.rowSelect}
                    aria-pressed={selected}
                    aria-label={`Select ${entry.name}`}
                    onClick={() => setSelectedKey(entry.key)}
                  >
                    <span className={styles.portrait} aria-hidden="true">
                      <Image
                        src={entry.image}
                        alt=""
                        fill
                        sizes="82px"
                        className={styles.portraitImage}
                      />
                      <Image
                        src={uiAssets.ui.frames.goldCircle}
                        alt=""
                        fill
                        sizes="88px"
                        className={styles.portraitFrame}
                      />
                    </span>

                    <span className={styles.rowCopy}>
                      <strong className={styles.rowName}>{entry.name}</strong>
                      <span className={styles.rowMeta}>{entry.worldName}</span>
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
                      sizes="440px"
                      className={styles.rowFrame}
                    />
                  </button>

                  <PinEntryButton
                    pinned={entry.pinned}
                    className={styles.favoriteButton}
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
          <Link className={styles.browseLink} href="/select?show=all">
            Browse all characters <span aria-hidden="true">›</span>
          </Link>
        ) : null}

        {selectedEntry ? (
          <TrackedEntryLink
            href={selectedEntry.href}
            className={styles.primaryAction}
            tracking={selectedEntry.tracking}
            ariaLabel={`${selectedEntry.actionLabel} as ${selectedEntry.name}`}
          >
            <Image
              src={uiAssets.ui.frames.goldPrimaryAction}
              alt=""
              fill
              sizes="440px"
              className={styles.primaryFrame}
            />
            <span>{selectedEntry.actionLabel}</span>
          </TrackedEntryLink>
        ) : (
          <Link className={styles.primaryAction} href="/select/create-character">
            <Image
              src={uiAssets.ui.frames.goldPrimaryAction}
              alt=""
              fill
              sizes="440px"
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
            className={styles.roleButton}
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
              sizes="220px"
              className={styles.roleFrame}
            />
            <span>Enter as Weaver</span>
          </TrackedEntryLink>

          <Link
            className={styles.roleButton}
            href="/world?mode=threadwatcher"
          >
            <Image
              src={uiAssets.ui.frames.goldRect}
              alt=""
              fill
              sizes="220px"
              className={styles.roleFrame}
            />
            <span>Threadwatcher</span>
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

        <nav className={styles.utilityLinks} aria-label="Character utilities">
          <Link href="/select/create-character">Create character</Link>
          <Link href="/select/join">Join with invite</Link>
          <Link href="/character">Manage characters</Link>
        </nav>
      </div>
    </section>
  )
}
