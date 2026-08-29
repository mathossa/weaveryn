import { cookies } from 'next/headers'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { uiAssets } from '@/lib/ui-assets'
import {
  characterEntryKey,
  portableCharacterEntryKey,
  type EntryCampaignChoice,
  type EntryPortableCharacterChoice,
  type EntryWorldCharacterChoice,
} from '@/server/selection'
import {
  CompactSelectLauncher,
  type CompactLauncherEntry,
} from './_components/compact-select-launcher'
import { loadSelectionPageData } from './_lib/load-selection-page-data'
import { resolveSelectCharacterArtwork } from './_lib/select-character-artwork'

interface SelectPageProps {
  searchParams: Promise<{
    show?: string | string[]
    sort?: string | string[]
    q?: string | string[]
    world?: string | string[]
  }>
}

type CharacterSortMode = 'recent' | 'alphabetical'
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
  const initialBrowserOpen =
    query.show === 'all' || Boolean(searchQuery) || Boolean(worldFilter)
  const savedSort = characterSortMode(
    (await cookies()).get('weaveryn-character-sort')?.value,
  )
  const initialBrowserSort =
    characterSortMode(query.sort) ?? savedSort ?? 'recent'
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

  const visibleCharacters = allCharacterEntries.slice(0, 3)
  const latestUsedAt = Math.max(
    weaverResume?.lastUsedAt?.getTime() ?? 0,
    ...allCharacterEntries.map(
      (entry) => entry.preference?.lastUsedAt?.getTime() ?? 0,
    ),
  )

  const compactEntries: CompactLauncherEntry[] = allCharacterEntries.map(
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
          worldId: null,
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
        worldId: entry.character.worldId,
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

  return (
    <AuthenticatedAppShell user={user} variant="launcher">
      <CompactSelectLauncher
        entries={compactEntries.slice(0, 3)}
        browserEntries={compactEntries}
        initialSelectedKey={initiallySelectedKey}
        initialBrowserOpen={initialBrowserOpen}
        initialBrowserQuery={searchQuery}
        initialBrowserWorld={worldFilter}
        initialBrowserSort={initialBrowserSort}
        hasMoreCharacters={allCharacterEntries.length > 3}
        pendingCampaigns={playerCampaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          href: `/character?world=${campaign.worldId}&campaign=${campaign.id}`,
        }))}
        weaverHref="/world?mode=weaver"
        weaverContext={null}
      />
    </AuthenticatedAppShell>
  )
}
