import Link from 'next/link'
import { cookies } from 'next/headers'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { StatusPanel } from '@/components/ui/status-panel'
import {
  characterEntryKey,
  portableCharacterEntryKey,
  type EntryCampaignChoice,
  type EntryPortableCharacterChoice,
  type EntryWorldCharacterChoice,
} from '@/server/selection'
import { CharacterChoiceCard } from './_components/character-choice-card'
import {
  CharacterSortControl,
  type CharacterSortMode,
} from './_components/character-sort-control'
import { PortableCharacterChoiceCard } from './_components/portable-character-choice-card'
import { loadSelectionPageData } from './_lib/load-selection-page-data'
import styles from './select.module.css'

interface SelectPageProps {
  searchParams: Promise<{
    show?: string | string[]
    sort?: string | string[]
  }>
}

type SelectionPageData = Awaited<ReturnType<typeof loadSelectionPageData>>
type EntryPreference = SelectionPageData['entryPreferences'][number]

interface WorldCharacterEntry {
  kind: 'world'
  key: string
  sortName: string
  character: EntryWorldCharacterChoice
  campaign: EntryCampaignChoice | null
  preference: EntryPreference | undefined
  createdAt: Date
}

interface PortableCharacterEntry {
  kind: 'portable'
  key: string
  sortName: string
  character: EntryPortableCharacterChoice
  preference: EntryPreference | undefined
  createdAt: Date
}

type CharacterEntry = WorldCharacterEntry | PortableCharacterEntry

function characterSortMode(
  value: string | string[] | undefined,
): CharacterSortMode | null {
  if (value === 'recent' || value === 'alphabetical') return value
  return null
}

export default async function SelectPage({ searchParams }: SelectPageProps) {
  const [{ user, selection, entryPreferences, weaverResume }, query] =
    await Promise.all([loadSelectionPageData(), searchParams])
  const showAll = query.show === 'all'
  const savedSort = characterSortMode(
    (await cookies()).get('weaveryn-character-sort')?.value,
  )
  const sortMode = showAll
    ? (characterSortMode(query.sort) ?? savedSort ?? 'recent')
    : 'recent'
  const preferenceByKey = new Map(
    entryPreferences.map((preference) => [preference.entryKey, preference]),
  )

  const playerCampaigns = selection.campaignMemberships.filter(
    (campaign) => campaign.role === 'PLAYER',
  )

  const characterEntries: CharacterEntry[] = [
    ...selection.characters.flatMap<WorldCharacterEntry>((character) =>
      character.campaigns.length > 0
        ? character.campaigns.map((campaign) => {
            const key = characterEntryKey(character.id, campaign.id)
            return {
              kind: 'world' as const,
              key,
              sortName: character.portableName,
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
                sortName: character.portableName,
                character,
                campaign: null,
                preference: preferenceByKey.get(key),
                createdAt: character.createdAt,
              },
            ]
          })(),
    ),
    ...selection.portableCharacters.map<PortableCharacterEntry>((character) => {
      const key = portableCharacterEntryKey(character.id)
      return {
        kind: 'portable',
        key,
        sortName: character.name,
        character,
        preference: preferenceByKey.get(key),
        createdAt: character.createdAt,
      }
    }),
  ].sort((left, right) => {
    if (sortMode === 'alphabetical') {
      const nameDifference = left.sortName.localeCompare(
        right.sortName,
        undefined,
        {
          sensitivity: 'base',
        },
      )
      return nameDifference || left.key.localeCompare(right.key)
    }

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
  const eagerCharacterCount = showAll ? 6 : 3
  const hasCharacterSection =
    characterEntries.length > 0 || playerCampaigns.length > 0
  const hasAnyEntry =
    characterEntries.length > 0 ||
    selection.campaignMemberships.length > 0 ||
    selection.weaverWorlds.length > 0

  const weaverResumeHref = weaverResume?.campaign
    ? `/world/${weaverResume.world.id}/campaign/${weaverResume.campaign.id}?mode=weaver`
    : weaverResume
      ? `/world/${weaverResume.world.id}?mode=weaver`
      : null
  const weaverResumeTracking = weaverResume
    ? {
        kind: 'WEAVER' as const,
        worldId: weaverResume.world.id,
        campaignId: weaverResume.campaign?.id,
      }
    : undefined
  const latestUsedAt = Math.max(
    weaverResume?.lastUsedAt?.getTime() ?? 0,
    ...characterEntries.map(
      (entry) => entry.preference?.lastUsedAt?.getTime() ?? 0,
    ),
  )
  const weaverHighlighted =
    latestUsedAt > 0 && weaverResume?.lastUsedAt?.getTime() === latestUsedAt
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
        description="Enter through a Character, manage the weave as Weaver, or observe a Campaign as Threadwatcher."
        wide
        bounded={showAll}
      >
        <div
          className={`${styles.stack} ${showAll ? styles.expandedStack : ''}`}
        >
          {hasCharacterSection ? (
            <section
              className={`${styles.section} ${showAll ? styles.expandedCharacterSection : ''}`}
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
                    Choose a Character directly. Campaigns that still need one
                    stay close to your Character choices.
                  </p>
                </div>
                {showAll ? <CharacterSortControl value={sortMode} /> : null}
              </div>

              {playerCampaigns.length > 0 ? (
                <div className={styles.pendingCampaigns}>
                  <span>Waiting for a Character</span>
                  {playerCampaigns.map((campaign) => (
                    <Link
                      className={styles.pendingCampaignLink}
                      href={`/character?world=${campaign.worldId}&campaign=${campaign.id}`}
                      key={campaign.id}
                    >
                      {campaign.name} →
                    </Link>
                  ))}
                </div>
              ) : null}

              {characterEntries.length > 0 ? (
                <div className={showAll ? styles.characterViewport : undefined}>
                  <div
                    className={`${styles.characterGrid} ${showAll ? styles.expandedCharacterGrid : ''}`}
                  >
                    {visibleCharacters.map((entry, index) =>
                      entry.kind === 'world' ? (
                        <CharacterChoiceCard
                          key={entry.key}
                          character={entry.character}
                          campaign={entry.campaign}
                          pinned={entry.preference?.pinned ?? false}
                          highlighted={
                            latestUsedAt > 0 &&
                            entry.preference?.lastUsedAt?.getTime() ===
                              latestUsedAt
                          }
                          eager={index < eagerCharacterCount}
                        />
                      ) : (
                        <PortableCharacterChoiceCard
                          key={entry.key}
                          character={entry.character}
                          eager={index < eagerCharacterCount}
                        />
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <p className={styles.muted}>
                  No Character entries yet. Choose a Campaign above or create a
                  Character below.
                </p>
              )}

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

          <section className={styles.section} aria-labelledby="role-entry">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="role-entry">Enter another role</h2>
                <p>Manage the weave, or observe without taking a Character.</p>
              </div>
            </div>

            <div className={styles.roleGrid}>
              <div
                className={`${styles.weaverCard} ${weaverHighlighted ? styles.resumeEntry : ''}`}
              >
                <Link
                  className={styles.weaverMainAction}
                  href="/world?mode=weaver"
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

                {weaverResumeHref ? (
                  <TrackedEntryLink
                    className={styles.weaverContinue}
                    href={weaverResumeHref}
                    tracking={weaverResumeTracking}
                  >
                    Continue
                  </TrackedEntryLink>
                ) : null}
              </div>

              <div className={styles.weaverCard}>
                <Link
                  className={styles.weaverMainAction}
                  href="/world?mode=threadwatcher"
                >
                  <span className={styles.weaverGlyph} aria-hidden="true">
                    ◉
                  </span>
                  <span className={styles.weaverCopy}>
                    <strong>Join as Threadwatcher</strong>
                    <span>
                      Choose a World, then a Campaign you can observe.
                    </span>
                  </span>
                  <span className={styles.weaverArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </section>

          {!hasAnyEntry ? (
            <StatusPanel tone="empty" title="Your weave is ready to begin">
              <p>
                You do not have a Character, Campaign role, or manageable World
                yet. Create a Character, join an invite, or enter as Weaver to
                begin a World.
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
