import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { portableCharacterIdentity } from '@/lib/portable-character-identity'
import { uiAssets } from '@/lib/ui-assets'
import { getAuthenticatedUser } from '@/server/auth'
import { characterService, listOwnedCharacterChoices } from '@/server/characters'
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

  const characters: ManageCharacterEntry[] = choices.map((character) => {
    const record = recordById.get(character.id)
    const identity = portableCharacterIdentity(record?.coreData)
    const artwork = resolveSelectCharacterArtwork(character.name)

    return {
      id: character.id,
      name: character.name,
      image:
        artwork?.portrait ?? character.image ?? uiAssets.fallbacks.character,
      ancestry: identity.ancestry,
      description: identity.description,
      worldCharacters: character.worldCharacters.map((incarnation) => ({
        id: incarnation.id,
        name: incarnation.name,
        worldId: incarnation.world.id,
        worldName: incarnation.world.name,
        campaignCount: incarnation.campaignIds.length,
      })),
    }
  })

  return (
    <AuthenticatedAppShell user={user} variant="launcher">
      <ManageCharacterArchive characters={characters} />
    </AuthenticatedAppShell>
  )
}
