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
        description="Portable identity, World identity, and Campaign participation remain separate layers."
        wide
        actions={
          <div className={styles.actions}>
            <Link
              className={styles.secondary}
              href={`/character/portable/${character.character.id}`}
            >
              Portable Character
            </Link>
            {worldEntityHref ? (
              <Link className={styles.secondary} href={worldEntityHref}>
                World Entity & Connections
              </Link>
            ) : null}
            <Link
              className={styles.secondary}
              href={`/world/${character.world.id}`}
            >
              Open World
            </Link>
          </div>
        }
      >
        <div className={styles.stack}>
          {targetCampaignId ? (
            <section className={styles.panel}>
              <h2>Campaign entry</h2>
              {targetParticipation ? (
                <div className={styles.actions}>
                  <Link
                    className={styles.button}
                    href={`/world/${character.world.id}/campaign/${targetParticipation.campaign.id}?character=${character.id}`}
                  >
                    Enter {targetParticipation.campaign.name}
                  </Link>
                </div>
              ) : targetCampaign ? (
                <>
                  <p>
                    You are a {targetCampaign.role} member of this Campaign.
                    Attach this WorldCharacter to participate.
                  </p>
                  <AttachCampaignButton
                    worldCharacterId={character.id}
                    worldId={character.world.id}
                    campaignId={targetCampaign.id}
                    campaignName={targetCampaign.name}
                  />
                </>
              ) : (
                <p className={styles.meta}>
                  This Campaign is not available for Character participation.
                </p>
              )}
            </section>
          ) : null}

          <div className={styles.identityGrid}>
            <section className={styles.panel}>
              <h2>Portable Character</h2>
              <CharacterPortrait
                image={character.character.image}
                name={character.character.name}
              />
              <p className={styles.meta}>
                This name and portrait belong to the portable Character and can
                follow it between Worlds.
              </p>
              <CharacterForm
                mode="edit"
                characterId={character.character.id}
                initialName={character.character.name}
              />
            </section>

            <section className={styles.panel}>
              <h2>WorldCharacter</h2>
              <p>
                <strong>World:</strong> {character.world.name}
              </p>
              <p className={styles.meta}>
                A World-specific name overrides the portable name only in this
                World.
              </p>
              {character.canEditWorldIdentity ? (
                <WorldCharacterForm
                  worldCharacterId={character.id}
                  initialNameOverride={character.nameOverride}
                />
              ) : (
                <p>This World identity is currently read-only.</p>
              )}
              {worldEntityHref ? (
                <div className={styles.actions}>
                  <Link className={styles.secondary} href={worldEntityHref}>
                    View World relationships
                  </Link>
                </div>
              ) : null}
              <div className={styles.dangerZone}>
                <div>
                  <strong>World lifecycle</strong>
                  <p className={styles.meta}>
                    Removing this WorldCharacter does not delete your portable
                    Character. An unused World entity is removed too; one with
                    World relationships or stored World content remains as a
                    normal Person / NPC.
                  </p>
                </div>
                <LeaveWorldAction
                  worldCharacterId={character.id}
                  portableCharacterId={character.character.id}
                  worldName={character.world.name}
                  hasCampaignParticipation={character.hasCampaignParticipation}
                />
              </div>
            </section>
          </div>

          <section className={styles.panel}>
            <h2>Campaign participation</h2>
            {character.participations.length === 0 ? (
              <p>
                This WorldCharacter does not participate in an accessible
                Campaign yet.
              </p>
            ) : (
              <div className={styles.list}>
                {character.participations.map((participation) => (
                  <div
                    className={`${styles.listItem} ${styles.participationItem}`}
                    key={participation.id}
                  >
                    <span className={styles.listCopy}>
                      <strong>{participation.campaign.name}</strong>
                      <span className={styles.meta}>
                        {participation.campaign.role} · {participation.status}
                      </span>
                    </span>
                    <div className={styles.participationActions}>
                      <Link
                        className={styles.secondary}
                        href={`/world/${character.world.id}/campaign/${participation.campaign.id}?character=${character.id}`}
                      >
                        Enter →
                      </Link>
                      <LeaveCampaignAction
                        campaignCharacterId={participation.id}
                        campaignName={participation.campaign.name}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {character.availableCampaigns.length > 0 ? (
            <section className={styles.panel}>
              <h2>Join another Campaign</h2>
              <p className={styles.meta}>
                Campaign membership comes first. Players can then attach their
                own WorldCharacter; GM and Assistant GM management permissions
                remain unchanged.
              </p>
              <div className={styles.list}>
                {character.availableCampaigns.map((campaign) => (
                  <div className={styles.listItem} key={campaign.id}>
                    <span className={styles.listCopy}>
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
            </section>
          ) : null}
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
