import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import {
  requestedCharacterContext,
  withCharacterContext,
} from '@/lib/campaign-context'
import { uiAssets } from '@/lib/ui-assets'
import { getWorldEntityWorkspace } from '@/server/world-entities'
import { loadWorldPageUser } from '../../../_lib/load-world-user'
import { connectionTypeLabel } from '../_components/connection-language'
import { ConnectionDialog } from '../_components/connection-dialog'
import { DeleteEntityButton } from '../_components/delete-entity-button'
import { DeleteRelationshipButton } from '../_components/delete-relationship-button'
import { EntityEditDialog } from '../_components/entity-edit-dialog'
import { EntityImageFocusControl } from '../_components/entity-image-focus-control'
import styles from '../entity.module.css'

interface WorldEntityDetailPageProps {
  params: Promise<{ worldId: string; entityId: string }>
  searchParams: Promise<{
    campaign?: string | string[]
    character?: string | string[]
  }>
}

function entityHref(
  worldId: string,
  entityId: string,
  campaignId?: string,
  worldCharacterId?: string,
) {
  const query = campaignId ? `?campaign=${campaignId}` : ''
  return withCharacterContext(
    `/world/${worldId}/entities/${entityId}${query}`,
    worldCharacterId,
  )
}

export default async function WorldEntityDetailPage({
  params,
  searchParams,
}: WorldEntityDetailPageProps) {
  const [{ worldId, entityId }, requested, user] = await Promise.all([
    params,
    searchParams,
    loadWorldPageUser(),
  ])
  const campaignId =
    typeof requested.campaign === 'string' ? requested.campaign : undefined
  const worldCharacterId = requestedCharacterContext(requested.character)
  const workspace = await getWorldEntityWorkspace(worldId, user.id, campaignId)
  if (!workspace) notFound()
  const entity = workspace.entities.find((choice) => choice.id === entityId)
  if (!entity) notFound()

  const outgoing = workspace.relationships.filter(
    (relationship) => relationship.sourceEntityId === entityId,
  )
  const incoming = workspace.relationships.filter(
    (relationship) => relationship.targetEntityId === entityId,
  )
  const connections = [
    ...outgoing.map((relationship) => ({
      relationship,
      otherEntityId: relationship.targetEntityId,
      sentence: `${entity.name} ${connectionTypeLabel(relationship.relationshipType)} ${relationship.targetName}`,
    })),
    ...incoming.map((relationship) => ({
      relationship,
      otherEntityId: relationship.sourceEntityId,
      sentence: `${relationship.sourceName} ${connectionTypeLabel(relationship.relationshipType)} ${entity.name}`,
    })),
  ]
  const entitiesHref = withCharacterContext(
    `/world/${worldId}/entities${campaignId ? `?campaign=${campaignId}` : ''}`,
    worldCharacterId,
  )
  const campaignHref = workspace.contextCampaign
    ? withCharacterContext(
        `/world/${worldId}/campaign/${workspace.contextCampaign.id}`,
        worldCharacterId,
      )
    : undefined
  const ownedCharacterHref =
    entity.worldCharacterId && entity.worldCharacterOwnedByCurrentUser
      ? `/character/${entity.worldCharacterId}${
          campaignId ? `?campaign=${campaignId}` : ''
        }`
      : undefined

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: { label: workspace.world.name, href: `/world/${worldId}` },
        ...(workspace.contextCampaign && campaignHref
          ? {
              campaign: {
                label: workspace.contextCampaign.name,
                href: campaignHref,
              },
            }
          : {}),
      }}
    >
      <AppPage
        eyebrow={entity.worldCharacterId ? 'Playable Character' : entity.type}
        title={entity.name}
        description={
          entity.description ||
          (entity.worldCharacterId
            ? 'This World entity is the graph identity of a playable WorldCharacter.'
            : 'No description has been added to this entity yet.')
        }
        wide
        actions={
          <div className={styles.actions}>
            {ownedCharacterHref ? (
              <Link
                className={styles.secondaryButton}
                href={ownedCharacterHref}
              >
                Open Character
              </Link>
            ) : null}
            <Link className={styles.secondaryButton} href={entitiesHref}>
              Back to entities
            </Link>
          </div>
        }
      >
        <div className={styles.detailWorkspace}>
          <div className={styles.detailScroll}>
            <EntityImageFocusControl
              worldId={worldId}
              entityId={entity.id}
              className={styles.detailBanner}
              src={
                entity.image ||
                uiAssets.resolveEntityFallbackArtwork(entity.type)
              }
              focusX={entity.imageFocusX}
              focusY={entity.imageFocusY}
              alt={`${entity.name} artwork`}
              editable={workspace.canEditContent}
            />

            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Entity details</h2>
                  <p>
                    {entity.worldCharacterId
                      ? 'Name and portrait resolve from the linked Character / WorldCharacter identity.'
                      : 'Persistent World identity and MVP structured information.'}
                  </p>
                </div>
                {workspace.canEditContent && !entity.worldCharacterId ? (
                  <EntityEditDialog
                    worldId={worldId}
                    contextCampaignId={campaignId}
                    entityTypes={workspace.entityTypes}
                    entities={workspace.entities}
                    relationshipTypes={workspace.relationshipTypes}
                    campaigns={workspace.campaigns}
                    visibilityUsers={workspace.visibilityUsers}
                    entity={entity}
                  />
                ) : null}
              </div>
              <dl className={styles.definitionGrid}>
                <div>
                  <dt>Type</dt>
                  <dd>{entity.worldCharacterId ? 'Character' : entity.type}</dd>
                </div>
                <div>
                  <dt>Visibility</dt>
                  <dd>
                    {entity.worldCharacterId
                      ? 'World / participating Campaigns'
                      : entity.visibilityScope}
                  </dd>
                </div>
                {entity.visibilityCampaignId && !entity.worldCharacterId ? (
                  <div>
                    <dt>Campaign target</dt>
                    <dd>
                      {workspace.campaigns.find(
                        (campaign) =>
                          campaign.id === entity.visibilityCampaignId,
                      )?.name ?? 'Targeted Campaign'}
                    </dd>
                  </div>
                ) : null}
                {entity.visibilityUserId && !entity.worldCharacterId ? (
                  <div>
                    <dt>Player target</dt>
                    <dd>
                      {workspace.visibilityUsers.find(
                        (choice) => choice.id === entity.visibilityUserId,
                      )?.label ?? 'Targeted player'}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {entity.worldCharacterId ? (
                <>
                  <h3>Playable Character identity</h3>
                  <p className={styles.helpText}>
                    This entity participates in the normal World relationship
                    graph, but its identity is managed through the Character
                    workflow rather than duplicated here.
                  </p>
                  {ownedCharacterHref ? (
                    <div className={styles.actions}>
                      <Link
                        className={styles.secondaryButton}
                        href={ownedCharacterHref}
                      >
                        Manage my Character
                      </Link>
                    </div>
                  ) : (
                    <p className={styles.helpText}>
                      This Character belongs to another player. Their editable
                      Character view is not exposed here.
                    </p>
                  )}
                </>
              ) : null}

              <h3>Custom fields</h3>
              {Object.keys(entity.data).length === 0 ? (
                <p className={styles.helpText}>No structured custom fields.</p>
              ) : (
                <dl className={styles.customFieldDisplay}>
                  {Object.entries(entity.data).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>
                        {typeof value === 'boolean'
                          ? value
                            ? 'Yes'
                            : 'No'
                          : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            {workspace.canEditContent && !entity.worldCharacterId ? (
              <section className={`${styles.panel} ${styles.dangerZone}`}>
                <h2>Delete entity</h2>
                <p>
                  Deleting this entity also removes its connections. It does not
                  delete the other connected entities.
                </p>
                <DeleteEntityButton
                  worldId={worldId}
                  entityId={entity.id}
                  entityName={entity.name}
                  contextCampaignId={campaignId}
                  contextWorldCharacterId={worldCharacterId}
                />
              </section>
            ) : null}
          </div>

          <aside className={styles.relationshipPanel}>
            <div className={styles.relationshipScroll}>
              <section className={styles.panel}>
                <div className={styles.sectionHeading}>
                  <div>
                    <h2>Connections</h2>
                    <p>
                      People, places, and other entities connected to this one.
                    </p>
                  </div>
                  {workspace.canEditContent ? (
                    <ConnectionDialog
                      worldId={worldId}
                      sourceEntityId={entity.id}
                      sourceEntityName={entity.name}
                      entities={workspace.entities}
                      relationshipTypes={workspace.relationshipTypes}
                      campaigns={workspace.campaigns}
                      visibilityUsers={workspace.visibilityUsers}
                      contextCampaignId={campaignId}
                    />
                  ) : null}
                </div>

                {connections.length === 0 ? (
                  <p className={styles.helpText}>No connections yet.</p>
                ) : (
                  <div className={styles.relationshipList}>
                    {connections.map(
                      ({ relationship, otherEntityId, sentence }) => (
                        <div
                          className={styles.relationshipItem}
                          key={relationship.id}
                        >
                          <Link
                            href={entityHref(
                              worldId,
                              otherEntityId,
                              campaignId,
                              worldCharacterId,
                            )}
                          >
                            <strong>{sentence}</strong>
                            {relationship.label ? (
                              <small>{relationship.label}</small>
                            ) : null}
                          </Link>
                          {workspace.canEditContent ? (
                            <DeleteRelationshipButton
                              worldId={worldId}
                              relationshipId={relationship.id}
                            />
                          ) : null}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </section>
            </div>
          </aside>
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
