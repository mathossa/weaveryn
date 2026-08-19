import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { withCharacterContext } from '@/lib/campaign-context'
import { uiAssets } from '@/lib/ui-assets'
import {
  getWorldCharacterOverview,
  visibleWorldCharacterProfileFields,
} from '@/server/characters'
import { AttachCampaignButton } from '../_components/attach-campaign-button'
import { CharacterEditDialog } from '../_components/character-edit-dialog'
import {
  LeaveCampaignAction,
  LeaveWorldAction,
} from '../_components/character-lifecycle-actions'
import { CharacterPortrait } from '../_components/character-portrait'
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

  const requestedCampaignId =
    typeof query.campaign === 'string' ? query.campaign : undefined
  const requestedParticipation = requestedCampaignId
    ? character.participations.find(
        (participation) => participation.campaign.id === requestedCampaignId,
      )
    : undefined
  const recentParticipation = character.recentCampaignId
    ? character.participations.find(
        (participation) =>
          participation.campaign.id === character.recentCampaignId,
      )
    : undefined
  const activeParticipation =
    requestedParticipation ?? recentParticipation ?? character.participations[0]
  const activeCampaignId = activeParticipation?.campaign.id
  const otherParticipations = character.participations.filter(
    (participation) => participation.id !== activeParticipation?.id,
  )
  const profileFields = visibleWorldCharacterProfileFields(character.profile)
  const profileValues = character.profile.values
  const quickFactKeys = ['home', 'personality', 'goals', 'affiliations'] as const
  const quickFacts = quickFactKeys
    .map((key) => ({
      key,
      label:
        profileFields.find((field) => field.key === key)?.label ?? '',
      value: profileValues[key],
    }))
    .filter((fact) => fact.label && fact.value)

  const worldEntityHref = character.worldEntityId
    ? withCharacterContext(
        `/world/${character.world.id}/entities/${character.worldEntityId}${
          activeCampaignId ? `?campaign=${activeCampaignId}` : ''
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
        ...(activeParticipation
          ? {
              campaign: {
                label: activeParticipation.campaign.name,
                href: `/world/${character.world.id}/campaign/${activeParticipation.campaign.id}?character=${character.id}`,
              },
            }
          : {}),
      }}
    >
      <AppPage
        eyebrow={character.world.name}
        title={character.displayName}
        description={
          activeParticipation
            ? `Character profile in ${character.world.name} · ${activeParticipation.campaign.name}`
            : `Character profile in ${character.world.name}`
        }
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
                  <span className={styles.profileKicker}>Character</span>
                  <h2>{character.displayName}</h2>
                  <p className={styles.meta}>
                    A Character with a place in {character.world.name}.
                  </p>
                </div>
              </section>
            </aside>

            <main className={styles.profileMainColumn}>
              {profileFields.some((field) => field.key === 'whoIs') ? (
                <section className={`${styles.panel} ${styles.profileStoryCard}`}>
                  <span className={styles.profileKicker}>Who are they?</span>
                  <h2>{character.displayName}</h2>
                  <p className={styles.profileStoryText}>
                    {profileValues.whoIs || 'No description has been added yet.'}
                  </p>
                </section>
              ) : null}

              <div className={styles.profileStoryGrid}>
                {profileFields
                  .filter((field) => field.key !== 'whoIs')
                  .map((field) => (
                    <section
                      className={`${styles.panel} ${styles.profileStoryMiniCard}`}
                      key={field.key}
                    >
                      <span className={styles.profileKicker}>{field.label}</span>
                      <p>
                        {profileValues[field.key] || 'Not added yet.'}
                      </p>
                    </section>
                  ))}
              </div>

              {worldEntityHref ? (
                <section className={`${styles.panel} ${styles.profileConnectionsCard}`}>
                  <div>
                    <span className={styles.profileKicker}>World connections</span>
                    <h2>People, places & relationships</h2>
                    <p className={styles.meta}>
                      Explore this Character&apos;s connections in {character.world.name}.
                    </p>
                  </div>
                  <Link className={styles.secondary} href={worldEntityHref}>
                    View connections
                  </Link>
                </section>
              ) : null}
            </main>

            <aside className={styles.profileSidebar}>
              <section className={`${styles.panel} ${styles.profileCampaignPanel}`}>
                <div className={styles.profileSectionHeading}>
                  <div>
                    <span className={styles.profileKicker}>Current Campaign</span>
                    <h2>
                      {activeParticipation
                        ? activeParticipation.campaign.name
                        : 'No active Campaign'}
                    </h2>
                  </div>
                  {activeParticipation ? (
                    <span className={styles.profileTag}>
                      {activeParticipation.status}
                    </span>
                  ) : null}
                </div>

                {activeParticipation ? (
                  <>
                    <div className={styles.profileCampaignArtwork}>
                      <Image
                        src={uiAssets.fallbacks.campaign}
                        alt=""
                        fill
                        sizes="(max-width: 900px) 100vw, 24rem"
                      />
                      <div className={styles.profileCampaignArtworkOverlay}>
                        <strong>{activeParticipation.campaign.name}</strong>
                        <span>
                          {activeParticipation.campaign.role} ·{' '}
                          {activeParticipation.campaign.status}
                        </span>
                      </div>
                    </div>
                    <Link
                      className={styles.button}
                      href={`/world/${character.world.id}/campaign/${activeParticipation.campaign.id}?character=${character.id}`}
                    >
                      Enter Campaign
                    </Link>
                    {otherParticipations.length > 0 ? (
                      <details className={styles.profileSwitchCampaign}>
                        <summary>Switch Campaign</summary>
                        <div className={styles.profileSwitchList}>
                          {otherParticipations.map((participation) => (
                            <Link
                              key={participation.id}
                              href={`/character/${character.id}?campaign=${participation.campaign.id}`}
                            >
                              <strong>{participation.campaign.name}</strong>
                              <span className={styles.meta}>
                                {participation.campaign.role}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </>
                ) : (
                  <p className={styles.meta}>
                    This Character is not currently participating in an accessible
                    Campaign.
                  </p>
                )}

                <details className={styles.profileParticipationManager}>
                  <summary>Manage participation</summary>
                  <div className={styles.profileParticipationBody}>
                    {character.participations.length > 0 ? (
                      <div className={styles.profileParticipationGroup}>
                        <strong>Current Campaigns</strong>
                        {character.participations.map((participation) => (
                          <div
                            className={styles.profileParticipationRow}
                            key={participation.id}
                          >
                            <span>
                              <strong>{participation.campaign.name}</strong>
                              <span className={styles.meta}>
                                {participation.campaign.role}
                              </span>
                            </span>
                            <LeaveCampaignAction
                              campaignCharacterId={participation.id}
                              campaignName={participation.campaign.name}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {character.availableCampaigns.length > 0 ? (
                      <div className={styles.profileParticipationGroup}>
                        <strong>Available Campaigns</strong>
                        {character.availableCampaigns.map((campaign) => (
                          <div
                            className={styles.profileParticipationRow}
                            key={campaign.id}
                          >
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
                    ) : null}

                    <div className={styles.profileParticipationGroup}>
                      <strong>World placement</strong>
                      <p className={styles.meta}>
                        Remove this Character from {character.world.name} only
                        after Campaign participation has been resolved.
                      </p>
                      <LeaveWorldAction
                        worldCharacterId={character.id}
                        portableCharacterId={character.character.id}
                        worldName={character.world.name}
                        hasCampaignParticipation={
                          character.hasCampaignParticipation
                        }
                      />
                    </div>
                  </div>
                </details>
              </section>

              <section className={`${styles.panel} ${styles.profileQuickFacts}`}>
                <div className={styles.profileSectionHeading}>
                  <div>
                    <span className={styles.profileKicker}>Quick facts</span>
                    <h2>About {character.displayName}</h2>
                  </div>
                </div>
                {quickFacts.length > 0 ? (
                  <dl className={styles.profileFactList}>
                    {quickFacts.map((fact) => (
                      <div key={fact.key}>
                        <dt>{fact.label}</dt>
                        <dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className={styles.meta}>
                    Add profile details to build this Character&apos;s quick facts.
                  </p>
                )}
              </section>

              <section className={`${styles.panel} ${styles.profileQuickActions}`}>
                <span className={styles.profileKicker}>Quick actions</span>
                <h2>Manage Character</h2>
                <div className={styles.profileNavigation}>
                  <CharacterEditDialog
                    characterId={character.character.id}
                    characterName={character.character.name}
                    worldCharacterId={character.id}
                    worldName={character.world.name}
                    nameOverride={character.nameOverride}
                    profile={character.profile}
                    canEditWorldIdentity={character.canEditWorldIdentity}
                  />
                  <Link
                    className={styles.secondary}
                    href={`/world/${character.world.id}`}
                  >
                    Open World
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
