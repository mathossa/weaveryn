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
    ...allCharacterEntries.map(
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
        eyebrow="Enter the living world"
        title="Continue Your Story"
        description="Choose who you are entering as. Each card opens the exact Character, World, and Campaign context you last inhabited."
        wide
      >
        <div className={styles.stack}>
          {hasCharacterSection ? (
            <section
              className={styles.section}
              aria-labelledby="recent-characters"
            >
              <div className={styles.sectionHeader}>
                <div>
                  <h2 id="recent-characters">
                    {showAll ? 'More Characters' : 'Your recent stories'}
                  </h2>
                  <p>
                    {showAll
                      ? 'Search or filter every available entry without leaving the launcher.'
                      : 'Pinned entries appear first, followed by the stories you opened most recently.'}
                  </p>
                </div>
                {showAll ? (
                  <CharacterSortControl
                    value={sortMode}
                    query={searchQuery || undefined}
                    world={worldFilter || undefined}
                  />
                ) : null}
              </div>

              {showAll ? (
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
                    <Link href={`/select?show=all&sort=${sortMode}`}>
                      Clear
                    </Link>
                  ) : null}
                </form>
              ) : null}

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
                  {showAll
                    ? 'No Character entries match these filters.'
                    : 'No Character entries yet. Choose a Campaign above or create a Character below.'}
                </p>
              )}

              {allCharacterEntries.length > 3 || showAll ? (
                <div className={styles.moreRow}>
                  <Link
                    className={styles.secondaryLink}
                    href={showAll ? '/select' : '/select?show=all'}
                  >
                    {showAll ? 'Back to recent stories' : 'More Characters'}
                  </Link>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className={styles.section} aria-labelledby="role-entry">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="role-entry">Other ways to enter</h2>
                <p>
                  Shape the weave, or observe it without taking a Character.
                </p>
              </div>
            </div>

            <div className={styles.roleGrid}>
              <div
                className={`${styles.weaverCard} ${weaverHighlighted ? styles.resumeEntry : ''}`}
              >
                <TrackedEntryLink
                  className={styles.weaverMainAction}
                  href={weaverResumeHref ?? '/world?mode=weaver'}
                  tracking={weaverResumeTracking}
                >
                  <span className={styles.weaverGlyph} aria-hidden="true">
                    ✦
                  </span>
                  <span className={styles.weaverCopy}>
                    <strong>Weaver</strong>
                    <span>
                      {weaverResumeLabel
                        ? `Continue ${weaverResumeLabel}`
                        : 'Choose a World to shape and manage.'}
                    </span>
                  </span>
                  <span className={styles.weaverArrow} aria-hidden="true">
                    →
                  </span>
                </TrackedEntryLink>
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
                    <strong>Threadwatcher</strong>
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
              <h2 id="entry-actions">Create and manage</h2>
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
              <Link className={styles.actionLink} href="/character">
                <strong>Manage Characters</strong>
                <span>Edit portable Characters and World identities.</span>
              </Link>
            </div>
          </section>
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
