import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { portableCharacterIdentity } from '@/lib/portable-character-identity'
import { uiAssets } from '@/lib/ui-assets'
import { getAuthenticatedUser } from '@/server/auth'
import {
  characterService,
  getPortableCharacterOverview,
  getWorldCharacterOverview,
  listOwnedCharacterChoices,
} from '@/server/characters'
import { resolveSelectCharacterArtwork } from '../_lib/select-character-artwork'
import {
  ManageCharacterArchive,
  type ManageCharacterEntry,
} from './manage-character-archive'

export default async function ManageCharactersPage() {
  const user = await getAuthenticatedUser(new Headers(await headers()))
  if (!user) redirect('/login')

  const [choices, records] = await Promise.all([
    listOwnedCharacterChoices(user.id),
    characterService.listCharacters(user.id),
  ])
  const recordById = new Map(records.map((record) => [record.id, record]))

  const characters: ManageCharacterEntry[] = await Promise.all(
    choices.map(async (character) => {
      const record = recordById.get(character.id)
      const identity = portableCharacterIdentity(record?.coreData)
      const artwork = resolveSelectCharacterArtwork(character.name)
      const [portableOverview, worldOverviews] = await Promise.all([
        getPortableCharacterOverview(character.id, user.id),
        Promise.all(
          character.worldCharacters.map((incarnation) =>
            getWorldCharacterOverview(incarnation.id, user.id),
          ),
        ),
      ])
      const worldOverviewById = new Map(
        worldOverviews
          .filter((overview) => overview !== null)
          .map((overview) => [overview.id, overview]),
      )

      return {
        id: character.id,
        name: character.name,
        image:
          artwork?.portrait ?? character.image ?? uiAssets.fallbacks.character,
        ancestry: identity.ancestry,
        description: identity.description,
        availableWorlds: portableOverview?.availableWorlds ?? [],
        unavailableWorlds:
          portableOverview?.unavailableWorldCharacters.map((incarnation) => ({
            id: incarnation.id,
            name: incarnation.world.name,
          })) ?? [],
        worldCharacters: character.worldCharacters.map((incarnation) => {
          const overview = worldOverviewById.get(incarnation.id)
          return {
            id: incarnation.id,
            name: incarnation.name,
            nameOverride: overview?.nameOverride ?? null,
            worldId: incarnation.world.id,
            worldName: incarnation.world.name,
            campaignCount: incarnation.campaignIds.length,
            profile: overview?.profile ?? { values: {}, hiddenFields: [] },
            participations:
              overview?.participations.map((participation) => ({
                id: participation.id,
                status: participation.status,
                campaign: participation.campaign,
              })) ?? [],
            availableCampaigns: overview?.availableCampaigns ?? [],
          }
        }),
      }
    }),
  )

  return (
    <AuthenticatedAppShell user={user} variant="launcher">
      <ManageCharacterArchive characters={characters} />
    </AuthenticatedAppShell>
  )
}
