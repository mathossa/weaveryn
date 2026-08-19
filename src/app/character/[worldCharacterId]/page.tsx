import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { withCharacterContext } from '@/lib/campaign-context'
import { getWorldCharacterOverview } from '@/server/characters'
import { AttachCampaignButton } from '../_components/attach-campaign-button'
import { CharacterForm } from '../_components/character-form'
import {
  LeaveCampaignAction,
  LeaveWorldAction,
} from '../_components/character-lifecycle-actions'
import { CharacterPortrait } from '../_components/character-portrait'
import { WorldCharacterForm } from '../_components/world-character-form'
import { loadCharacterPageUser } from '../_lib/load-character-user'
import styles from '../character.module.css'

interface WorldCharacterPageProps {
  params: Promise<{ worldCharacterId: string }>
  searchParams: Promise<{ campaign?: string | string[] }>
}

export default async function WorldCharacterPage({
  params,
  searchParams,
}: WorldCharacterPageProps) {
  const [{ worldCharacterId }, query, user] = await Promise.all([
    params,
    searchParams,
    loadCharacterPageUser(),
  ])
  const character = await getWorldCharacterOverview(worldCharacterId, user.id)
  if (!character) notFound()

  const targetCampaignId =
    typeof query.campaign === 'string' ? query.campaign : undefined
  const targetParticipation = targetCampaignId
    ? character.participations.find(
        (participation) => participation.campaign.id === targetCampaignId,
      )
    : undefined
  const targetCampaign = targetCampaignId
    ? character.availableCampaigns.find(
        (campaign) => campaign.id === targetCampaignId,
      )
    : undefined
  const participations = [
    ...(targetParticipation ? [targetParticipation] : []),
    ...character.participations.filter(
      (participation) => participation.id !== targetParticipation?.id,
    ),
  ]
  const availableCampaigns = [
    ...(targetCampaign ? [targetCampaign] : []),
    ...character.availableCampaigns.filter(
      (campaign) => campaign.id !== targetCampaign?.id,
    ),
  ]
  const worldEntityHref = character.worldEntityId
    ? withCharacterContext(
        `/world/${character.world.id}/entities/${character.worldEntityId}${
          targetCampaignId ? `?campaign=${targetCampaignId}` : ''
        }`,
        character.id,
      )
    : undefined

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: {
          label: character.world.name,
          href: `/world/${character.world.id}`,
        },
        character: {
          label: character.displayName,
          href: `/character/${character.id}`,
        },
        ...(targetParticipation
          ? {
              campaign: {
                label: targetParticipation.campaign.name,
                href: `/world/${character.world.id}/campaign/${targetParticipation.campaign.id}?character=${character.id}`,
              },
            }
          : {}),
      }}
    >
      <AppPage
        eyebrow={character.world.name}
        title={character.displayName}
        description={`Manage ${character.displayName}'s portable identity, World presence, and Campaign participation.`}
        wide
      >
        <div className={styles.characterProfile}>
          <div className={styles.profileGrid}>
            <aside className={styles.profilePortraitColumn}>
              <section className={`${styles.panel} ${styles.profilePortraitPanel}`}>
                <CharacterPortrait
                  image={character.character.image}
                  name={character.character.name}
                />

                <div className={styles.profileOverview}>
                  <div className={styles.profileSectionHeading}>
                    <div>
                      <span className={styles.profileKicker}>Character identity</span>
                      <h2>{character.character.name}</h2>
                    </div>
                    <span className={styles.profileTag}>Portable</span>
                  </div>
                  <p className={styles.meta}>
                    This identity belongs to you and can be used in another World.
                  </p>
                  <dl className={styles.profileFactList}>
                    <div>
                      <dt>World identity</dt>
                      <dd>{character.displayName}</dd>
                    </div>
                    <div>
                      <dt>World</dt>
                      <dd>{character.world.name}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{character.status}</dd>
                    </div>
                  </dl>
                </div>

                <details className={styles.profileEdit}>
                  <summary>Edit portable identity</summary>
                  <CharacterForm
                    mode="edit"
                    characterId={character.character.id}
                    initialName={character.character.name}
                  />
                </details>
              </section>
            </aside>

            <main className={styles.profileMainColumn}>
              <section className={`${styles.panel} ${styles.profileFeatureCard}`}>
                <div className={styles.profileSectionHeading}>
                  <div>
                    <span className={styles.profileKicker}>World identity</span>
                    <h2>{character.displayName}</h2>
                  </div>
                  <span className={styles.profileTag}>{character.world.name}</span>
                </div>
                <p>
                  This is the Character as they exist in {character.world.name}.
                  A World-specific name can differ from the portable Character
                  without changing that portable identity.
                </p>

                <dl className={styles.profileDefinitionGrid}>
                  <div>
                    <dt>Portable name</dt>
                    <dd>{character.character.name}</dd>
                  </div>
                  <div>
                    <dt>World-specific name</dt>
                    <dd>
                      {character.nameOverride?.trim() || 'Uses portable name'}
                    </dd>
                  </div>
                </dl>

                {character.canEditWorldIdentity ? (
                  <details className={styles.profileEdit}>
                    <summary>Edit World identity</summary>
                    <WorldCharacterForm
                      worldCharacterId={character.id}
                      initialNameOverride={character.nameOverride}
                    />
                  </details>
                ) : (
                  <p className={styles.meta}>
                    This World identity is currently read-only.
                  </p>
                )}
              </section>

              <section className={`${styles.panel} ${styles.profileFeatureCard}`}>
                <div className={styles.profileSectionHeading}>
                  <div>
                    <span className={styles.profileKicker}>World presence</span>
                    <h2>Connections & story</h2>
                  </div>
                  <span className={styles.profileTag}>World graph</span>
                </div>
                <p>
                  Relationships, factions, homes, people, places, and other
                  World-specific story connections belong to this Character's
                  World presence.
                </p>
                {worldEntityHref ? (
                  <div className={styles.actions}>
                    <Link className={styles.secondary} href={worldEntityHref}>
                      Open World connections
                    </Link>
                  </div>
                ) : (
                  <p className={styles.meta}>
                    No linked World entity is currently available.
                  </p>
                )}
              </section>
            </main>

            <aside className={styles.profileSidebar}>
              <section className={`${styles.panel} ${styles.profileCampaignPanel}`}>
                <div className={styles.profileSectionHeading}>
                  <div>
                    <span className={styles.profileKicker}>Campaigns</span>
                    <h2>Participation</h2>
                  </div>
                  {participations.length > 0 ? (
                    <span className={styles.profileTag}>
                      {participations.length} active
                    </span>
                  ) : null}
                </div>

                {participations.length === 0 ? (
                  <p className={styles.meta}>
                    This WorldCharacter is not currently participating in an
                    accessible Campaign.
                  </p>
                ) : (
                  <div className={styles.profileCampaignList}>
                    {participations.map((participation) => (
                      <article
                        className={styles.profileCampaignCard}
                        key={participation.id}
                      >
                        <div className={styles.profileCampaignHeader}>
                          <div>
                            <strong>{participation.campaign.name}</strong>
                            <span className={styles.meta}>
                              {participation.campaign.role} · {participation.status}
                            </span>
                          </div>
                          {participation.campaign.id === targetCampaignId ? (
                            <span className={styles.profileActiveTag}>Current</span>
                          ) : null}
                        </div>
                        <div className={styles.profileCampaignActions}>
                          <Link
                            className={styles.button}
                            href={`/world/${character.world.id}/campaign/${participation.campaign.id}?character=${character.id}`}
                          >
                            Enter Campaign
                          </Link>
                          <LeaveCampaignAction
                            campaignCharacterId={participation.id}
                            campaignName={participation.campaign.name}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {availableCampaigns.length > 0 ? (
                  <div className={styles.profileJoinBlock}>
                    <strong>Join another Campaign</strong>
                    <p className={styles.meta}>
                      Campaign membership comes first. Then attach this
                      WorldCharacter to participate.
                    </p>
                    <div className={styles.profileCampaignList}>
                      {availableCampaigns.map((campaign) => (
                        <div className={styles.profileJoinRow} key={campaign.id}>
                          <span>
                            <strong>{campaign.name}</strong>
                            <span className={styles.meta}>{campaign.role}</span>
                          </span>
                          <AttachCampaignButton
                            worldCharacterId={character.id}
                            worldId={character.world.id}
                            campaignId={campaign.id}
                            campaignName={campaign.name}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className={`${styles.panel} ${styles.profileQuickFacts}`}>
                <div className={styles.profileSectionHeading}>
                  <div>
                    <span className={styles.profileKicker}>Quick facts</span>
                    <h2>Character context</h2>
                  </div>
                </div>
                <dl className={styles.profileFactList}>
                  <div>
                    <dt>Portable Character</dt>
                    <dd>{character.character.name}</dd>
                  </div>
                  <div>
                    <dt>WorldCharacter</dt>
                    <dd>{character.displayName}</dd>
                  </div>
                  <div>
                    <dt>World</dt>
                    <dd>{character.world.name}</dd>
                  </div>
                  <div>
                    <dt>Campaigns</dt>
                    <dd>{participations.length}</dd>
                  </div>
                </dl>
                <div className={styles.profileNavigation}>
                  <Link
                    className={styles.secondary}
                    href={`/character/portable/${character.character.id}`}
                  >
                    Portable Character
                  </Link>
                  <Link
                    className={styles.secondary}
                    href={`/world/${character.world.id}`}
                  >
                    Open World
                  </Link>
                </div>
              </section>

              <section className={`${styles.panel} ${styles.profileLifecyclePanel}`}>
                <div>
                  <span className={styles.profileKicker}>World lifecycle</span>
                  <h2>Leave {character.world.name}</h2>
                  <p className={styles.meta}>
                    Your portable Character remains yours. An unused World entity
                    is removed; one with World relationships or stored World
                    content remains behind as a normal Person / NPC.
                  </p>
                </div>
                <LeaveWorldAction
                  worldCharacterId={character.id}
                  portableCharacterId={character.character.id}
                  worldName={character.world.name}
                  hasCampaignParticipation={character.hasCampaignParticipation}
                />
              </section>
            </aside>
          </div>
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
