import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { getPortableCharacterOverview } from '@/server/characters'
import { AddToWorldButton } from '../../_components/add-to-world-button'
import { CharacterForm } from '../../_components/character-form'
import { CharacterPortrait } from '../../_components/character-portrait'
import { loadCharacterPageUser } from '../../_lib/load-character-user'
import styles from '../../character.module.css'

interface PortableCharacterPageProps {
  params: Promise<{ characterId: string }>
  searchParams: Promise<{
    world?: string | string[]
    campaign?: string | string[]
  }>
}

export default async function PortableCharacterPage({
  params,
  searchParams,
}: PortableCharacterPageProps) {
  const [{ characterId }, query, user] = await Promise.all([
    params,
    searchParams,
    loadCharacterPageUser(),
  ])
  const character = await getPortableCharacterOverview(characterId, user.id)
  if (!character) notFound()

  const targetWorldId =
    typeof query.world === 'string' ? query.world : undefined
  const targetCampaignId =
    typeof query.campaign === 'string' ? query.campaign : undefined
  const targetIncarnation = targetWorldId
    ? character.worldCharacters.find(
        (incarnation) => incarnation.world.id === targetWorldId,
      )
    : undefined
  const targetWorld = targetWorldId
    ? character.availableWorlds.find((world) => world.id === targetWorldId)
    : undefined

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        character: {
          label: character.name,
          href: `/character/portable/${character.id}`,
        },
      }}
    >
      <AppPage
        eyebrow="Portable Character"
        title={character.name}
        description="This identity belongs to you independently of any World or Campaign."
        wide
        actions={
          <Link className={styles.secondary} href="/character">
            All Characters
          </Link>
        }
      >
        <div className={styles.stack}>
          {targetWorldId ? (
            <section className={styles.panel}>
              <h2>Continue into the selected World</h2>
              {targetIncarnation ? (
                <div className={styles.actions}>
                  <Link
                    className={styles.button}
                    href={`/character/${targetIncarnation.id}${targetCampaignId ? `?campaign=${targetCampaignId}` : ''}`}
                  >
                    Continue as {targetIncarnation.name}
                  </Link>
                </div>
              ) : targetWorld ? (
                <AddToWorldButton
                  characterId={character.id}
                  worldId={targetWorld.id}
                  worldName={targetWorld.name}
                  campaignId={targetCampaignId}
                />
              ) : (
                <p className={styles.meta}>
                  This World is not currently available for a playable
                  incarnation of this Character.
                </p>
              )}
            </section>
          ) : null}

          <div className={styles.identityGrid}>
            <section className={styles.panel}>
              <h2>Portable identity</h2>
              <CharacterPortrait
                image={character.image}
                name={character.name}
              />
              <CharacterForm
                mode="edit"
                characterId={character.id}
                initialName={character.name}
              />
              <p className={styles.meta}>
                Portrait upload is not part of this MVP screen yet. Existing
                artwork is shown when available; otherwise the shared Character
                placeholder is used.
              </p>
            </section>

            <section className={styles.panel}>
              <h2>World incarnations</h2>
              {character.worldCharacters.length === 0 ? (
                <p>No currently accessible World incarnations.</p>
              ) : (
                <div className={styles.list}>
                  {character.worldCharacters.map((incarnation) => (
                    <Link
                      className={styles.listItem}
                      href={`/character/${incarnation.id}`}
                      key={incarnation.id}
                    >
                      <span className={styles.listCopy}>
                        <strong>{incarnation.name}</strong>
                        <span className={styles.meta}>
                          {incarnation.world.name}
                        </span>
                      </span>
                      <span>Open →</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className={styles.panel}>
            <h2>Add to a World</h2>
            <p className={styles.meta}>
              Creating a WorldCharacter does not change the portable Character.
              The same Character can have one distinct incarnation per World.
              Threadwatcher-only Campaign access does not create a playable
              World incarnation.
            </p>
            {character.availableWorlds.length === 0 ? (
              <p>No additional authorized Worlds are available right now.</p>
            ) : (
              <div className={styles.list}>
                {character.availableWorlds.map((world) => (
                  <div className={styles.listItem} key={world.id}>
                    <span className={styles.listCopy}>
                      <strong>{world.name}</strong>
                      <span className={styles.meta}>New World incarnation</span>
                    </span>
                    <AddToWorldButton
                      characterId={character.id}
                      worldId={world.id}
                      worldName={world.name}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className={styles.actions}>
              <Link className={styles.secondary} href="/character">
                Do this later
              </Link>
            </div>
          </section>
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
