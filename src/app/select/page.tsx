import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { characterEntryKey } from '@/server/selection'
import { CharacterChoiceCard } from './_components/character-choice-card'
import { PortableCharacterChoiceCard } from './_components/portable-character-choice-card'
import { loadSelectionPageData } from './_lib/load-selection-page-data'
import styles from './select.module.css'

interface SelectPageProps {
  searchParams: Promise<{ show?: string | string[] }>
}

export default async function SelectPage({ searchParams }: SelectPageProps) {
  const [
    { user, selection, entryPreferences, weaverResume },
    query,
  ] = await Promise.all([loadSelectionPageData(), searchParams])
  const showAll = query.show === 'all'
  const preferenceByKey = new Map(
    entryPreferences.map((preference) => [preference.entryKey, preference]),
  )

  const characterEntries = [
    ...selection.characters.flatMap((character) =>
      character.campaigns.length > 0
        ? character.campaigns.map((campaign) => {
            const key = characterEntryKey(character.id, campaign.id)
            return {
              kind: 'world' as const,
              key,
              character,
              campaign,
              preference: preferenceByKey.get(key),
              createdAt: character.createdAt,
            }
          })
        : (() => {
            const key = characterEntryKey(character.id)
            return [
              {
                kind: 'world' as const,
                key,
                character,
                campaign: null,
                preference: preferenceByKey.get(key),
                createdAt: character.createdAt,
              },
            ]
          })(),
    ),
    ...selection.portableCharacters.map((character) => ({
      kind: 'portable' as const,
      key: `portable-${character.id}`,
      character,
      preference: undefined,
      createdAt: character.createdAt,
    })),
  ].sort((left, right) => {
    const pinnedDifference =
      Number(right.preference?.pinned ?? false) -
      Number(left.preference?.pinned ?? false)
    if (pinnedDifference !== 0) return pinnedDifference

    const lastUsedDifference =
      (right.preference?.lastUsedAt?.getTime() ?? 0) -
      (left.preference?.lastUsedAt?.getTime() ?? 0)
    if (lastUsedDifference !== 0) return lastUsedDifference

    return (
      right.createdAt.getTime() - left.createdAt.getTime() ||
      left.key.localeCompare(right.key)
    )
  })

  const visibleCharacters = showAll
    ? characterEntries
    : characterEntries.slice(0, 3)
  const hasAnyEntry =
    characterEntries.length > 0 || selection.weaverWorlds.length > 0

  const weaverHref = weaverResume?.campaign
    ? `/select/weaver?world=${weaverResume.world.id}&campaign=${weaverResume.campaign.id}`
    : weaverResume?.world
      ? `/select/weaver?world=${weaverResume.world.id}`
      : '/select/weaver'
  const latestUsedAt = Math.max(
    weaverResume?.lastUsedAt?.getTime() ?? 0,
    ...characterEntries.map(
      (entry) => entry.preference?.lastUsedAt?.getTime() ?? 0,
    ),
  )
  const weaverHighlighted =
    latestUsedAt > 0 &&
    weaverResume?.lastUsedAt?.getTime() === latestUsedAt
  const weaverResumeLabel = weaverResume
    ? weaverResume.campaign
      ? `${weaverResume.world.name} — ${weaverResume.campaign.name}`
      : weaverResume.world.name
    : null

  return (
    <AuthenticatedAppShell user={user}>
      <AppPage
        eyebrow="Signed in"
        title="Choose Entity"
        description="Enter directly through a character and Campaign, or join as Weaver to manage Worlds and Campaigns."
        wide
      >
        <div className={styles.stack}>
          {characterEntries.length > 0 ? (
            <section
              className={styles.section}
              aria-labelledby="recent-characters"
            >
              <div className={styles.sectionHeader}>
                <div>
                  <h2 id="recent-characters">
                    {showAll
                      ? 'All character entries'
                      : 'Pinned and recent character entries'}
                  </h2>
                  <p>
                    Each Campaign is a direct entry for that WorldCharacter. A
                    WorldCharacter without a Campaign opens in its World context.
                  </p>
                </div>
              </div>

              <div className={showAll ? styles.characterViewport : undefined}>
                <div className={styles.characterGrid}>
                  {visibleCharacters.map((entry, index) =>
                    entry.kind === 'world' ? (
                      <CharacterChoiceCard
                        key={entry.key}
                        character={entry.character}
                        campaign={entry.campaign}
                        pinned={entry.preference?.pinned ?? false}
                        highlighted={
                          latestUsedAt > 0 &&
                          entry.preference?.lastUsedAt?.getTime() === latestUsedAt
                        }
                        eager={index < 3}
                      />
                    ) : (
                      <PortableCharacterChoiceCard
                        key={entry.key}
                        character={entry.character}
                        eager={index < 3}
                      />
                    ),
                  )}
                </div>
              </div>

              {characterEntries.length > 3 ? (
                <div className={styles.moreRow}>
                  <Link
                    className={styles.secondaryLink}
                    href={showAll ? '/select' : '/select?show=all'}
                  >
                    {showAll ? 'Show recent' : 'More characters'}
                  </Link>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className={styles.section} aria-labelledby="weaver-entry">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="weaver-entry">Weaver</h2>
                <p>Enter through the game-master side of Weaveryn.</p>
              </div>
            </div>
            <Link
              className={`${styles.weaverCard} ${weaverHighlighted ? styles.resumeEntry : ''}`}
              href={weaverHref}
            >
              <span className={styles.weaverGlyph} aria-hidden="true">
                ✦
              </span>
              <span className={styles.weaverCopy}>
                <strong>Join as Weaver</strong>
                <span>
                  {weaverResumeLabel
                    ? `Last managed: ${weaverResumeLabel}`
                    : 'Choose a World, then continue to Campaign management.'}
                </span>
              </span>
              <span className={styles.weaverArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </section>

          {!hasAnyEntry ? (
            <StatusPanel tone="empty" title="Your weave is ready to begin">
              <p>
                You do not have a Character or manageable World yet. Create a
                Character, join an invite, or enter as Weaver to begin a World.
              </p>
            </StatusPanel>
          ) : null}

          <section className={styles.section} aria-labelledby="entry-actions">
            <div className={styles.sectionHeader}>
              <h2 id="entry-actions">Start something new</h2>
            </div>
            <div className={styles.actions}>
              <Link
                className={styles.actionLink}
                href="/select/create-character"
              >
                <strong>Create Character</strong>
                <span>Start a new portable Character identity.</span>
              </Link>
              <Link className={styles.actionLink} href="/select/join">
                <strong>Join with invite</strong>
                <span>Use a World or Campaign invitation.</span>
              </Link>
            </div>
          </section>
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
