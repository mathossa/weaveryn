import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { CharacterChoiceCard } from './_components/character-choice-card'
import { PortableCharacterChoiceCard } from './_components/portable-character-choice-card'
import { loadSelectionPageData } from './_lib/load-selection-page-data'
import styles from './select.module.css'

interface SelectPageProps {
  searchParams: Promise<{ show?: string | string[] }>
}

export default async function SelectPage({ searchParams }: SelectPageProps) {
  const [{ user, selection }, query] = await Promise.all([
    loadSelectionPageData(),
    searchParams,
  ])
  const showAll = query.show === 'all'
  const characterEntries = [
    ...selection.characters.flatMap((character) =>
      character.campaigns.length > 0
        ? character.campaigns.map((campaign) => ({
            kind: 'world' as const,
            key: `world-${character.id}-campaign-${campaign.id}`,
            character,
            campaign,
            createdAt: character.createdAt,
          }))
        : [
            {
              kind: 'world' as const,
              key: `world-${character.id}-no-campaign`,
              character,
              campaign: null,
              createdAt: character.createdAt,
            },
          ],
    ),
    ...selection.portableCharacters.map((character) => ({
      kind: 'portable' as const,
      key: `portable-${character.id}`,
      character,
      createdAt: character.createdAt,
    })),
  ].sort(
    (left, right) =>
      right.createdAt.getTime() - left.createdAt.getTime() ||
      left.key.localeCompare(right.key),
  )
  const visibleCharacters = showAll
    ? characterEntries
    : characterEntries.slice(0, 3)
  const hasAnyEntry =
    characterEntries.length > 0 || selection.weaverWorlds.length > 0

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
                    {showAll ? 'All character entries' : 'Recent character entries'}
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
            <Link className={styles.weaverCard} href="/select/weaver">
              <span className={styles.weaverGlyph} aria-hidden="true">
                ✦
              </span>
              <span className={styles.weaverCopy}>
                <strong>Join as Weaver</strong>
                <span>
                  Choose a World, then continue to Campaign management.
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
