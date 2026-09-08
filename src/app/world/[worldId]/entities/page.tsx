import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import {
  requestedCharacterContext,
  withCampaignContext,
  withCharacterContext,
} from '@/lib/campaign-context'
import { uiAssets } from '@/lib/ui-assets'
import { getWorldCharacterOverview } from '@/server/characters'
import { getWorldEntityBrowseWorkspace } from '@/server/world-entities'
import { loadWorldPageUser } from '../../_lib/load-world-user'
import { EntityBrowser } from './_components/entity-browser'
import styles from './entity.module.css'

interface WorldEntitiesPageProps {
  params: Promise<{ worldId: string }>
  searchParams: Promise<{
    campaign?: string | string[]
    character?: string | string[]
    mode?: string | string[]
  }>
}

export default async function WorldEntitiesPage({
  params,
  searchParams,
}: WorldEntitiesPageProps) {
  const [{ worldId }, requested, user] = await Promise.all([
    params,
    searchParams,
    loadWorldPageUser(),
  ])
  const weaverMode = requested.mode === 'weaver'
  const campaignId =
    !weaverMode && typeof requested.campaign === 'string'
      ? requested.campaign
      : undefined
  const worldCharacterId = !weaverMode
    ? requestedCharacterContext(requested.character)
    : undefined
  const workspace = await getWorldEntityBrowseWorkspace(
    worldId,
    user.id,
    campaignId,
  )
  if (!workspace) notFound()

  const requestedWorldCharacter =
    worldCharacterId && workspace.contextCampaign
      ? await getWorldCharacterOverview(worldCharacterId, user.id)
      : null
  const contextCharacter =
    requestedWorldCharacter?.world.id === worldId &&
    requestedWorldCharacter.participations.some(
      (participation) =>
        participation.status === 'ACTIVE' &&
        participation.campaign.id === workspace.contextCampaign?.id,
    )
      ? requestedWorldCharacter
      : undefined

  const worldHref = weaverMode
    ? `/world/${worldId}?mode=weaver`
    : withCampaignContext(
        `/world/${worldId}`,
        workspace.contextCampaign?.id,
        contextCharacter?.id,
      )
  const backHref = workspace.contextCampaign
    ? withCharacterContext(
        `/world/${worldId}/campaign/${workspace.contextCampaign.id}`,
        contextCharacter?.id,
      )
    : worldHref
  const entityCreateHref = weaverMode
    ? `/world/${worldId}/entities/create?mode=weaver`
    : withCampaignContext(
        `/world/${worldId}/entities/create`,
        workspace.contextCampaign?.id,
        contextCharacter?.id,
      )

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: { id: worldId, label: workspace.world.name, href: worldHref },
        ...(workspace.contextCampaign
          ? {
              campaign: {
                id: workspace.contextCampaign.id,
                label: workspace.contextCampaign.name,
                href: backHref,
              },
            }
          : {}),
        ...(contextCharacter && workspace.contextCampaign
          ? {
              character: {
                id: contextCharacter.id,
                label: contextCharacter.displayName,
                href: `/character/${contextCharacter.id}?campaign=${workspace.contextCampaign.id}`,
              },
            }
          : {}),
        ...(weaverMode ? { mode: 'weaver' as const } : {}),
      }}
    >
      <AppPage
        eyebrow={
          workspace.contextCampaign ? 'Campaign World view' : 'Worldbuilding'
        }
        title="World entities"
        description={
          workspace.contextCampaign
            ? `Browsing ${workspace.world.name} through ${workspace.contextCampaign.name}. Only entities you are authorized to see in this context are returned by the backend.`
            : `Browse the interconnected people, places, organizations, items, and custom concepts in ${workspace.world.name}.`
        }
        wide
        actions={
          <>
            <Link className={styles.secondaryButton} href={backHref}>
              {workspace.contextCampaign
                ? 'Back to Campaign'
                : 'World overview'}
            </Link>
            {workspace.canEditContent ? (
              <Link className={styles.primaryButton} href={entityCreateHref}>
                Create entity
              </Link>
            ) : null}
          </>
        }
      >
        {workspace.world.accessKind === 'CAMPAIGN_ONLY' ? (
          <div className={styles.notice}>
            Campaign-only access does not grant unrestricted World browsing.
            This list contains only content visible through your Campaign role
            or targeted visibility.
          </div>
        ) : null}
        <div
          aria-hidden="true"
          style={{
            minHeight: 'clamp(5.5rem, 8vw, 8rem)',
            marginBottom: '1rem',
            overflow: 'hidden',
            border: '1px solid var(--ui-border)',
            borderRadius: 'var(--ui-radius-panel)',
            backgroundImage: `linear-gradient(90deg, rgba(7, 9, 14, 0.38), rgba(7, 9, 14, 0.08), rgba(7, 9, 14, 0.38)), url("${uiAssets.backgrounds.entityBanner.src}")`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />
        <EntityBrowser
          worldId={worldId}
          campaignId={campaignId}
          worldCharacterId={contextCharacter?.id}
          entities={workspace.entities}
        />
      </AppPage>
    </AuthenticatedAppShell>
  )
}
