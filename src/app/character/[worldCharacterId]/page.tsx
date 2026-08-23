import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { withCharacterContext } from '@/lib/campaign-context'
import { campaignRoleLabel } from '@/lib/role-labels'
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
import { CharacterProfileIcon } from '../_components/character-profile-icon'
import { loadCharacterPageUser } from '../_lib/load-character-user'
import profileStyles from '../character-profile.module.css'
import styles from '../character.module.css'

interface WorldCharacterPageProps {
  params: Promise<{ worldCharacterId: string }>
  searchParams: Promise<{ campaign?: string | string[] }>
}

function summarizeQuickFact(value: string | undefined) {
  if (!value) return undefined

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined

  const sentenceMatch = normalized.match(/^.*?[.!?](?:\s|$)/)
  const firstSentence = (sentenceMatch?.[0] ?? normalized).replace(
    /[.!?]+$/,
    '',
  )
  const words = firstSentence.split(' ')
  const summary =
    words.length > 10 ? `${words.slice(0, 10).join(' ')}…` : firstSentence

  return summary.length > 80 ? `${summary.slice(0, 77).trimEnd()}…` : summary
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
  const customDetails = Object.entries(character.customFields)
  const descriptionVisible = profileFields.some(
    (field) => field.key === 'whoIs',
  )
  const detailFields = profileFields.filter((field) => field.key !== 'whoIs')
  const quickFactKeys = [
    'home',
    'personality',
    'goals',
    'affiliations',
  ] as const
  const quickFacts = quickFactKeys
    .map((key) => ({
      key,
      label: profileFields.find((field) => field.key === key)?.label ?? '',
      value: summarizeQuickFact(profileValues[key]),
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

  const participationManager = (
    <details className={profileStyles.participationManager}>
      <summary>Manage participation</summary>
      <div className={profileStyles.participationBody}>
        {character.participations.length > 0 ? (
          <div className={profileStyles.participationGroup}>
            <strong>Current Campaigns</strong>
            {character.participations.map((participation) => (
              <div
                className={profileStyles.participationRow}
                key={participation.id}
              >
                <span>
                  <strong>{participation.campaign.name}</strong>
                  <span className={styles.meta}>
                    {campaignRoleLabel(participation.campaign.role)}
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
          <div className={profileStyles.participationGroup}>
            <strong>Available Campaigns</strong>
            {character.availableCampaigns.map((campaign) => (
              <div className={profileStyles.participationRow} key={campaign.id}>
                <span>
                  <strong>{campaign.name}</strong>
                  <span className={styles.meta}>
                    {campaignRoleLabel(campaign.role)}
                  </span>
                </span>
                <AttachCampaignButton
                  worldCharacterId={character.id}
                  worldId={character.world.id}
                  campaignId={campaign.id}
                  campaignName={campaign.name}
                  label="Join"
                />
              </div>
            ))}
          </div>
        ) : null}

        <div className={profileStyles.participationGroup}>
          <strong>World placement</strong>
          <p className={styles.meta}>
            Remove this Character from {character.world.name} only after
            Campaign participation has been resolved.
          </p>
          <LeaveWorldAction
            worldCharacterId={character.id}
            portableCharacterId={character.character.id}
            worldName={character.world.name}
            hasCampaignParticipation={character.hasCampaignParticipation}
          />
        </div>
      </div>
    </details>
  )

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
          <div className={profileStyles.profileGrid}>
            <aside className={profileStyles.profilePortraitColumn}>
              <section
                className={`${styles.panel} ${profileStyles.profileIdentityPanel}`}
              >
                <div className={profileStyles.profilePortraitFrame}>
                  <CharacterPortrait
                    image={character.character.image}
                    name={character.character.name}
                  />
                </div>
                <div className={profileStyles.profileIdentityCopy}>
                  <span className={styles.profileKicker}>Character</span>
                  <h2>{character.displayName}</h2>
                  {descriptionVisible ? (
                    <>
                      <div className={profileStyles.identityDivider} />
                      <p className={profileStyles.identityDescription}>
                        {profileValues.whoIs ||
                          'No description has been added yet.'}
                      </p>
                    </>
                  ) : null}
                </div>
              </section>
            </aside>

            <main className={profileStyles.profileMainColumn}>
              <section
                className={`${styles.panel} ${profileStyles.profileDetailsPanel}`}
              >
                <div className={profileStyles.profileDetailsHeader}>
                  <span className={styles.profileKicker}>Profile</span>
                </div>
                {detailFields.length > 0 ? (
                  <div className={profileStyles.profileDetailList}>
                    {detailFields.map((field) => (
                      <div
                        className={profileStyles.profileDetailRow}
                        key={field.key}
                      >
                        <span className={styles.profileKicker}>
                          {field.label}
                        </span>
                        <p>{profileValues[field.key] || 'Not added yet.'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.meta}>
                    No additional profile fields are currently visible.
                  </p>
                )}

                {customDetails.length > 0 ? (
                  <div className={profileStyles.profileAdditionalDetails}>
                    <div className={profileStyles.profileDetailsHeader}>
                      <span className={styles.profileKicker}>
                        Additional details
                      </span>
                    </div>
                    <div className={profileStyles.profileDetailList}>
                      {customDetails.map(([key, value]) => (
                        <div
                          className={profileStyles.profileDetailRow}
                          key={key}
                        >
                          <span className={styles.profileKicker}>{key}</span>
                          <p>
                            {typeof value === 'boolean'
                              ? value
                                ? 'Yes'
                                : 'No'
                              : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </main>

            <aside className={profileStyles.profileSidebar}>
              <section
                className={`${styles.panel} ${profileStyles.profileCampaignPanel}`}
              >
                <span className={styles.profileKicker}>Current Campaign</span>
                {activeParticipation ? (
                  <div className={profileStyles.campaignArtwork}>
                    <div className={profileStyles.campaignArtworkImage}>
                      <Image
                        src={uiAssets.fallbacks.campaign}
                        alt=""
                        fill
                        sizes="(max-width: 900px) 100vw, 24rem"
                        loading="eager"
                      />
                    </div>
                    <div className={profileStyles.campaignArtworkCopy}>
                      <strong>{activeParticipation.campaign.name}</strong>
                      <span>
                        {campaignRoleLabel(activeParticipation.campaign.role)} ·{' '}
                        {activeParticipation.campaign.status}
                      </span>
                    </div>
                    <Link
                      className={profileStyles.campaignEnter}
                      href={`/world/${character.world.id}/campaign/${activeParticipation.campaign.id}?character=${character.id}`}
                    >
                      Enter
                    </Link>
                    <details className={profileStyles.campaignMenu}>
                      <summary aria-label="Campaign options">⋯</summary>
                      <div className={profileStyles.campaignMenuPopover}>
                        {otherParticipations.length > 0 ? (
                          <div className={profileStyles.menuSection}>
                            <span className={styles.profileKicker}>
                              Switch Campaign
                            </span>
                            <div className={profileStyles.switchCampaignList}>
                              {otherParticipations.map((participation) => (
                                <Link
                                  key={participation.id}
                                  href={`/character/${character.id}?campaign=${participation.campaign.id}`}
                                >
                                  <strong>{participation.campaign.name}</strong>
                                  <span className={styles.meta}>
                                    {campaignRoleLabel(
                                      participation.campaign.role,
                                    )}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div className={profileStyles.menuSection}>
                          {participationManager}
                        </div>
                      </div>
                    </details>
                  </div>
                ) : (
                  <div className={profileStyles.emptyCampaign}>
                    <p className={styles.meta}>
                      This Character is not currently participating in an
                      accessible Campaign.
                    </p>
                    {participationManager}
                  </div>
                )}
              </section>

              <section
                className={`${styles.panel} ${profileStyles.quickFactsPanel}`}
              >
                <span className={styles.profileKicker}>Quick facts</span>
                {quickFacts.length > 0 ? (
                  <dl className={profileStyles.factList}>
                    {quickFacts.map((fact) => (
                      <div key={fact.key}>
                        <dt>{fact.label}</dt>
                        <dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className={styles.meta}>
                    Add profile details to build this Character&apos;s quick
                    facts.
                  </p>
                )}
              </section>

              <section
                className={`${styles.panel} ${profileStyles.quickActionsPanel}`}
              >
                <span className={styles.profileKicker}>Quick actions</span>
                <div className={profileStyles.quickActionGrid}>
                  <CharacterEditDialog
                    characterId={character.character.id}
                    characterName={character.character.name}
                    worldCharacterId={character.id}
                    worldName={character.world.name}
                    nameOverride={character.nameOverride}
                    profile={character.profile}
                    customFields={character.customFields}
                    canEditWorldIdentity={character.canEditWorldIdentity}
                    triggerClassName={profileStyles.quickAction}
                    triggerContent={
                      <>
                        <CharacterProfileIcon name="edit" />
                        <span>Edit</span>
                      </>
                    }
                  />
                  {worldEntityHref ? (
                    <Link
                      className={profileStyles.quickAction}
                      href={worldEntityHref}
                    >
                      <CharacterProfileIcon name="connections" />
                      <span>Connections</span>
                    </Link>
                  ) : null}
                  <Link
                    className={profileStyles.quickAction}
                    href={`/world/${character.world.id}`}
                  >
                    <CharacterProfileIcon name="world" />
                    <span>World</span>
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
