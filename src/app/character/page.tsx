import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { listOwnedCharacterChoices } from '@/server/characters'
import { loadCharacterPageUser } from './_lib/load-character-user'
import styles from './character.module.css'

interface CharacterIndexPageProps {
  searchParams: Promise<{
    world?: string | string[]
    campaign?: string | string[]
  }>
}

function targetQuery(worldId?: string, campaignId?: string) {
  const query = new URLSearchParams()
  if (worldId) query.set('world', worldId)
  if (campaignId) query.set('campaign', campaignId)
  const value = query.toString()
  return value ? `?${value}` : ''
}

export default async function CharacterIndexPage({
  searchParams,
}: CharacterIndexPageProps) {
  const [query, user] = await Promise.all([searchParams, loadCharacterPageUser()])
  const worldId = typeof query.world === 'string' ? query.world : undefined
  const campaignId =
    typeof query.campaign === 'string' ? query.campaign : undefined
  const characters = await listOwnedCharacterChoices(user.id)

  function hrefFor(character: (typeof characters)[number]) {
    if (!worldId) return `/character/portable/${character.id}`
    const incarnation = character.worldCharacters.find(
      (choice) => choice.world.id === worldId,
    )
    if (!incarnation) {
      return `/character/portable/${character.id}${targetQuery(worldId, campaignId)}`
    }
    if (campaignId && incarnation.campaignIds.includes(campaignId)) {
      return `/world/${worldId}/campaign/${campaignId}?character=${incarnation.id}`
    }
    return `/character/${incarnation.id}${campaignId ? `?campaign=${campaignId}` : ''}`
  }

  return (
    <AuthenticatedAppShell user={user}>
      <AppPage
        eyebrow="Characters"
        title={campaignId ? 'Choose a Character for this Campaign' : 'Your Characters'}
        description={
          campaignId
            ? 'Choose an existing portable Character or create a new one. Weaveryn will keep its World incarnation and Campaign participation separate.'
            : 'Portable Characters can have separate incarnations in multiple Worlds and independent participation in Campaigns.'
        }
        wide
        actions={
          <Link
            className={styles.secondary}
            href={`/character/create${targetQuery(worldId, campaignId)}`}
          >
            Create Character
          </Link>
        }
      >
        {characters.length === 0 ? (
          <StatusPanel tone="empty" title="No Characters yet">
            <p>Create a portable Character first. Adding it to a World is optional.</p>
          </StatusPanel>
        ) : (
          <div className={styles.grid}>
            {characters.map((character) => (
              <Link className={styles.card} href={hrefFor(character)} key={character.id}>
                <strong>{character.name}</strong>
                <span className={styles.meta}>
                  {character.worldCharacters.length === 0
                    ? 'Portable only'
                    : `${character.worldCharacters.length} World incarnation${character.worldCharacters.length === 1 ? '' : 's'}`}
                </span>
                {character.worldCharacters.slice(0, 3).map((incarnation) => (
                  <span key={incarnation.id}>
                    {incarnation.name} · {incarnation.world.name}
                  </span>
                ))}
              </Link>
            ))}
          </div>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
