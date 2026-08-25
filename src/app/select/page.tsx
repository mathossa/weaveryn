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
import refineStyles from './select-launcher-refinement.module.css'
import polishStyles from './select-polish.module.css'
import styles from './select.module.css'

interface SelectPageProps {
  searchParams: Promise<{
    show?: string | string[]
    sort?: string | string[]
    q?: string | string[]
    world?: string | string[]
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
  const searchQuery = typeof query.q === 'string' ? query.q.trim() : ''
  const worldFilter = typeof query.world === 'string' ? query.world : ''
  const showAll =
    query.show === 'all' || Boolean(searchQuery) || Boolean(worldFilter)
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

  const allCharacterEntries: CharacterEntry[] = [
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
  ]
  const characterEntries = allCharacterEntries
    .filter((entry) => {
      if (
        worldFilter &&
        (entry.kind === 'portable' || entry.character.worldId !== worldFilter)
      ) {
        return false
      }
      if (!searchQuery) return true
      const search = searchQuery.toLocaleLowerCase()
      const values =
        entry.kind === 'portable'
          ? [entry.character.name, 'portable character']
          : [
              entry.character.name,
              entry.character.portableName,
              entry.character.worldName,
              entry.campaign?.name ?? '',
            ]
      return values.some((value) => value.toLocaleLowerCase().includes(search))
    })
    .sort((left, right) => {
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

  const worldChoices = Array.from(
    new Map(
      selection.characters.map((character) => [
        character.worldId,
        character.worldName,
      ]),
    ),
    ([id, name]) => ({ id, name }),
  ).sort((left, right) => left.name.localeCompare(right.name))

  const visibleCharacters = characterEntries.slice(0, 3)
  const eagerCharacterCount = 3
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
    ...allCharacterEntries.map(
      (entry) => entry.preference?.lastUsedAt?.getTime() ?? 0,
    ),
  )
  const weaverHighlighted =
    latestUsedAt > 0 && weaverResume?.lastUsedAt?.getTime() === latestUsedAt

  return (
    <AuthenticatedAppShell user={user} variant="launcher">
      <AppPage
        title={showAll ? 'Browse the Weave' : 'Return to the Weave'}
        layout="workspace"
        className={`${styles.launcherPage} ${polishStyles.polishedLauncher} ${!hasCharacterSection && !showAll ? polishStyles.emptyLauncher : ''} ${showAll ? `${styles.expandedLauncher} ${polishStyles.browserLauncher} ${refineStyles.browserMode}` : `${polishStyles.compactLauncher} ${refineStyles.launcherMode}`}`}
        actions={
          allCharacterEntries.length > 3 ? (
            <Link
              className={styles.moreCharactersButton}
              href={showAll ? '/select' : '/select?show=all'}
            >
              {showAll ? 'Return to recent' : 'Browse all characters'}
              <span aria-hidden="true">→</span>
            </Link>
          ) : undefined
        }
      >
        <div className={`${styles.stack} ${polishStyles.stack}`}>
          {!hasAnyEntry ? (
            <div className={polishStyles.emptyState}>
              <StatusPanel tone="empty" title="Your weave is ready to begin">
                <p>
                  You do not have a Character, Campaign role, or manageable
                  World yet. Create a Character, join an invite, or enter as
                  Weaver to begin a World.
                </p>
              </StatusPanel>
            </div>
          ) : null}

          {hasCharacterSection ? (
            <section
              className={`${styles.section} ${polishStyles.recentStories}`}
              aria-labelledby="recent-characters"
            >
              <div className={styles.sectionHeader}>
                <h2 id="recent-characters">Recent threads</h2>
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
                <div className={styles.characterEntries}>
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
            </section>
          ) : null}

          {showAll ? (
            <section className={`${styles.section} ${styles.characterBrowser}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 id="all-characters">All Character entries</h2>
                  <p>
                    Search or filter every available entry without leaving the
                    launcher.
                  </p>
                </div>
                <CharacterSortControl
                  value={sortMode}
                  query={searchQuery || undefined}
                  world={worldFilter || undefined}
                />
              </div>

              <form className={styles.browserFilters} method="get">
                <input type="hidden" name="show" value="all" />
                <input type="hidden" name="sort" value={sortMode} />
                <label>
                  <span>Search</span>
                  <input
                    type="search"
                    name="q"
                    defaultValue={searchQuery}
                    placeholder="Character, World, or Campaign"
                  />
                </label>
                <label>
                  <span>World</span>
                  <select name="world" defaultValue={worldFilter}>
                    <option value="">All Worlds</option>
                    {worldChoices.map((world) => (
                      <option value={world.id} key={world.id}>
                        {world.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit">Apply</button>
                {searchQuery || worldFilter ? (
                  <Link href={`/select?show=all&sort=${sortMode}`}>Clear</Link>
                ) : null}
              </form>

              {characterEntries.length > 0 ? (
                <div className={styles.characterViewport}>
                  <div
                    className={`${styles.characterGrid} ${styles.expandedCharacterGrid}`}
                  >
                    {characterEntries.map((entry, index) =>
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
                          eager={index < 6}
                        />
                      ) : (
                        <PortableCharacterChoiceCard
                          key={entry.key}
                          character={entry.character}
                          eager={index < 6}
                        />
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <p className={styles.muted}>
                  No Character entries match these filters.
                </p>
              )}
            </section>
          ) : null}

          {!showAll ? (
            <div className={polishStyles.secondaryHeading}>
              <span aria-hidden="true">✦</span>
              <h2 id="secondary-entry-heading">
                Other paths through the Weave
              </h2>
            </div>
          ) : null}

          {!showAll ? (
            <section
              className={`${styles.section} ${styles.entryPaths} ${polishStyles.alternateEntry}`}
              aria-labelledby="secondary-entry-heading"
            >
              <div className={styles.roleGrid}>
                <div
                  className={`${styles.weaverCard} ${polishStyles.modePanel} ${weaverHighlighted ? `${styles.resumeEntry} ${polishStyles.resumeEntry}` : ''}`}
                >
                  <TrackedEntryLink
                    className={`${styles.weaverMainAction} ${polishStyles.modeLink} ${weaverResume ? refineStyles.weaverResumeTile : ''}`}
                    href={weaverResumeHref ?? '/world?mode=weaver'}
                    tracking={weaverResumeTracking}
                  >
                    <span
                      className={`${styles.weaverGlyph} ${polishStyles.modeGlyph}`}
                      aria-hidden="true"
                    >
                      ✦
                    </span>
                    <span
                      className={`${styles.weaverCopy} ${polishStyles.modeCopy}`}
                    >
                      <span className={polishStyles.modeKicker}>
                        Shape the story
                      </span>
                      <strong>Weaver</strong>
                      <span className={polishStyles.modeDescription}>
                        Return behind the veil to guide a World and its
                        Campaigns.
                      </span>
                      {weaverResume ? (
                        <span className={polishStyles.modeContext}>
                          <small>Resume</small>
                          <span>
                            {weaverResume.world.name}
                            {weaverResume.campaign
                              ? ` · ${weaverResume.campaign.name}`
                              : ''}
                          </span>
                        </span>
                      ) : (
                        <span className={polishStyles.modeContext}>
                          <small>Begin</small>
                          <span>Choose a World to shape and manage.</span>
                        </span>
                      )}
                    </span>
                    <span className={styles.weaverArrow} aria-hidden="true">
                      →
                    </span>
                  </TrackedEntryLink>
                  {weaverResume ? (
                    <Link
                      className={refineStyles.changeWeaver}
                      href="/world?mode=weaver"
                    >
                      Change
                    </Link>
                  ) : null}
                </div>

                <div
                  className={`${styles.weaverCard} ${polishStyles.modePanel}`}
                >
                  <Link
                    className={`${styles.weaverMainAction} ${polishStyles.modeLink}`}
                    href="/world?mode=threadwatcher"
                  >
                    <span
                      className={`${styles.weaverGlyph} ${polishStyles.modeGlyph}`}
                      aria-hidden="true"
                    >
                      ◉
                    </span>
                    <span
                      className={`${styles.weaverCopy} ${polishStyles.modeCopy}`}
                    >
                      <span className={polishStyles.modeKicker}>
                        Observe the story
                      </span>
                      <strong>Threadwatcher</strong>
                      <span className={polishStyles.modeDescription}>
                        Follow a Campaign without entering as a Character.
                      </span>
                      <span className={polishStyles.modeContext}>
                        <small>Entry</small>
                        <span>Choose a visible read-only Campaign.</span>
                      </span>
                    </span>
                    <span className={styles.weaverArrow} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          {!showAll ? (
            <section
              className={`${styles.section} ${styles.entryActions} ${polishStyles.managementActions}`}
              aria-labelledby="launcher-utilities-heading"
            >
              <div className={polishStyles.utilityHeading}>
                <h2 id="launcher-utilities-heading">Utilities</h2>
                <span>Create, join, or tend your identities</span>
              </div>

              <div className={styles.actions}>
                <div
                  className={`${styles.weaverCard} ${polishStyles.utilityFrame}`}
                >
                  <Link
                    className={`${styles.weaverMainAction} ${polishStyles.utilityLink}`}
                    href="/select/create-character"
                  >
                    <span className={styles.weaverGlyph} aria-hidden="true">
                      ✦
                    </span>
                    <span className={styles.weaverCopy}>
                      <strong>Create Character</strong>
                      <span>Begin a new portable identity.</span>
                    </span>
                    <span className={styles.weaverArrow} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>

                <div
                  className={`${styles.weaverCard} ${polishStyles.utilityFrame}`}
                >
                  <Link
                    className={`${styles.weaverMainAction} ${polishStyles.utilityLink}`}
                    href="/select/join"
                  >
                    <span className={styles.weaverGlyph} aria-hidden="true">
                      ↗
                    </span>
                    <span className={styles.weaverCopy}>
                      <strong>Join with invite</strong>
                      <span>Enter a World or Campaign.</span>
                    </span>
                    <span className={styles.weaverArrow} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>

                <div
                  className={`${styles.weaverCard} ${polishStyles.utilityFrame}`}
                >
                  <Link
                    className={`${styles.weaverMainAction} ${polishStyles.utilityLink}`}
                    href="/character"
                  >
                    <span className={styles.weaverGlyph} aria-hidden="true">
                      ⚙
                    </span>
                    <span className={styles.weaverCopy}>
                      <strong>Manage Characters</strong>
                      <span>Edit your portable identities.</span>
                    </span>
                    <span className={styles.weaverArrow} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
