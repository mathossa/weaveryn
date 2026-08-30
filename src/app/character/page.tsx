import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { getCampaignOverview } from '@/server/campaigns'
import { listOwnedCharacterChoices } from '@/server/characters'
import { AddToWorldButton } from './_components/add-to-world-button'
import { AttachCampaignButton } from './_components/attach-campaign-button'
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
  const [query, user] = await Promise.all([
    searchParams,
    loadCharacterPageUser(),
  ])
  const worldId = typeof query.world === 'string' ? query.world : undefined
  const campaignId =
    typeof query.campaign === 'string' ? query.campaign : undefined

  if (!worldId && !campaignId) redirect('/select/manage-characters')

  const characters = await listOwnedCharacterChoices(user.id)
  const campaign =
    worldId && campaignId
      ? await getCampaignOverview(worldId, campaignId, user.id)
      : null

  if (campaignId && (!worldId || !campaign)) notFound()

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
        title={
          campaignId
            ? 'Choose a Character for this Campaign'
            : 'Your Characters'
        }
        description={
          campaignId
            ? `Choose a Character for ${campaign?.name}. Only the incarnation in ${campaign?.world.name} is relevant here; portable Characters can be added to that World.`
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
            <p>
              Create a portable Character first. Adding it to a World is
              optional.
            </p>
          </StatusPanel>
        ) : campaign && worldId && campaignId ? (
          <div className={styles.grid}>
            {characters.map((character) => {
              const incarnation = character.worldCharacters.find(
                (choice) => choice.world.id === worldId,
              )
              const alreadyParticipating = Boolean(
                incarnation?.campaignIds.includes(campaignId),
              )

              return (
                <article
                  className={`${styles.card} ${styles.campaignCharacterCard}`}
                  key={character.id}
                >
                  <strong>{incarnation?.name ?? character.name}</strong>
                  <span className={styles.meta}>
                    {incarnation
                      ? `${campaign.world.name} WorldCharacter`
                      : `Portable Character · not yet in ${campaign.world.name}`}
                  </span>

                  <div className={styles.cardAction}>
                    {alreadyParticipating && incarnation ? (
                      <Link
                        className={styles.button}
                        href={`/world/${worldId}/campaign/${campaignId}?character=${incarnation.id}`}
                        title={`Enter as ${incarnation.name}`}
                      >
                        Enter Campaign
                      </Link>
                    ) : incarnation ? (
                      <AttachCampaignButton
                        worldCharacterId={incarnation.id}
                        worldId={worldId}
                        campaignId={campaignId}
                        campaignName={campaign.name}
                        label="Join Campaign"
                      />
                    ) : (
                      <AddToWorldButton
                        characterId={character.id}
                        worldId={worldId}
                        worldName={campaign.world.name}
                        campaignId={campaignId}
                        label="Add to World"
                      />
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className={styles.grid}>
            {characters.map((character) => (
              <Link
                className={styles.card}
                href={hrefFor(character)}
                key={character.id}
              >
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
