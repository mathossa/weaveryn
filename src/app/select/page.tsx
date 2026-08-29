import Link from 'next/link'
import { cookies } from 'next/headers'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { uiAssets } from '@/lib/ui-assets'
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
import {
  CompactSelectLauncher,
  type CompactLauncherEntry,
} from './_components/compact-select-launcher'
import { PortableCharacterChoiceCard } from './_components/portable-character-choice-card'
import { loadSelectionPageData } from './_lib/load-selection-page-data'
import { resolveSelectCharacterArtwork } from './_lib/select-character-artwork'
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
  const latestUsedAt = Math.max(
    weaverResume?.lastUsedAt?.getTime() ?? 0,
    ...allCharacterEntries.map(
      (entry) => entry.preference?.lastUsedAt?.getTime() ?? 0,
    ),
  )

  const weaverResumeHref = weaverResume?.campaign
    ? `/world/${weaverResume.world.id}/campaign/${weaverResume.campaign.id}?mode=weaver`
    : weaverResume
      ? `/world/${weaverResume.world.id}?mode=weaver`
      : '/world?mode=weaver'
  const weaverResumeTracking = weaverResume
    ? {
        kind: 'WEAVER' as const,
        worldId: weaverResume.world.id,
        campaignId: weaverResume.campaign?.id,
      }
    : undefined

  const compactEntries: CompactLauncherEntry[] = visibleCharacters.map(
    (entry) => {
      if (entry.kind === 'portable') {
        const image = entry.character.image ?? uiAssets.fallbacks.character
        const artwork = resolveSelectCharacterArtwork(entry.character.name)
        return {
          kind: 'portable',
          key: entry.key,
          name: entry.character.name,
          image: artwork?.portrait ?? image,
          heroSrc: artwork?.hero ?? image,
          heroIsPortraitFallback: !artwork,
          worldName: 'Portable character',
          campaignName: null,
          href: `/character/${entry.character.id}`,
          actionLabel: 'Open Character',
          pinned: entry.preference?.pinned ?? false,
          pinTarget: {
            characterId: entry.character.id,
          },
          tracking: {
            kind: 'PORTABLE_CHARACTER',
            characterId: entry.character.id,
          },
        }
      }

      const image = entry.character.image ?? uiAssets.fallbacks.character
      const campaign = entry.campaign
      const artwork = resolveSelectCharacterArtwork(
        entry.character.portableName,
        entry.character.name,
      )
      return {
        kind: 'world',
        key: entry.key,
        name: entry.character.name,
        image: artwork?.portrait ?? image,
        heroSrc: artwork?.hero ?? image,
        heroIsPortraitFallback: !artwork,
        worldName: entry.character.worldName,
        campaignName: campaign?.name ?? null,
        href: campaign
          ? `/world/${entry.character.worldId}/campaign/${campaign.id}?character=${entry.character.id}`
          : `/character/${entry.character.id}`,
        actionLabel: campaign ? 'Enter Campaign' : 'Open Character',
        pinned: entry.preference?.pinned ?? false,
        pinTarget: {
          worldCharacterId: entry.character.id,
          campaignId: campaign?.id ?? null,
        },
        tracking: {
          kind: 'CHARACTER',
          worldCharacterId: entry.character.id,
          campaignId: campaign?.id,
        },
      }
    },
  )

  const initiallySelectedKey =
    visibleCharacters.find(
      (entry) =>
        latestUsedAt > 0 &&
        entry.preference?.lastUsedAt?.getTime() === latestUsedAt,
    )?.key ?? visibleCharacters[0]?.key

  if (!showAll) {
    return (
      <AuthenticatedAppShell user={user} variant="launcher">
        <CompactSelectLauncher
          entries={compactEntries}
          initialSelectedKey={initiallySelectedKey}
          hasMoreCharacters={allCharacterEntries.length > 3}
          pendingCampaigns={playerCampaigns.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            href: `/character?world=${campaign.worldId}&campaign=${campaign.id}`,
          }))}
          weaverHref={weaverResumeHref}
          weaverTracking={weaverResumeTracking}
          weaverContext={
            weaverResume
              ? `${weaverResume.world.name}${weaverResume.campaign ? ` · ${weaverResume.campaign.name}` : ''}`
              : null
          }
        />
      </AuthenticatedAppShell>
    )
  }

  return (
    <AuthenticatedAppShell user={user} variant="launcher">
      <AppPage
        title="Browse the Weave"
        layout="workspace"
        className={`${styles.launcherPage} ${polishStyles.polishedLauncher} ${styles.expandedLauncher} ${polishStyles.browserLauncher} ${refineStyles.browserMode}`}
        actions={
          allCharacterEntries.length > 3 ? (
            <Link className={styles.moreCharactersButton} href="/select">
              Return to recent
              <span aria-hidden="true">→</span>
            </Link>
          ) : undefined
        }
      >
        <div className={`${styles.stack} ${polishStyles.stack}`}>
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
                        pinned={entry.preference?.pinned ?? false}
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
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
