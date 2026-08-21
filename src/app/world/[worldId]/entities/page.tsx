import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import {
  requestedCharacterContext,
  withCharacterContext,
} from '@/lib/campaign-context'
import { getWorldEntityBrowseWorkspace } from '@/server/world-entities'
import { loadWorldPageUser } from '../../_lib/load-world-user'
import { EntityBrowser } from './_components/entity-browser'
import styles from './entity.module.css'

interface WorldEntitiesPageProps {
  params: Promise<{ worldId: string }>
  searchParams: Promise<{
    campaign?: string | string[]
    character?: string | string[]
  }>
}

function campaignQuery(campaignId?: string, worldCharacterId?: string) {
  const params = new URLSearchParams()
  if (campaignId) params.set('campaign', campaignId)
  if (worldCharacterId) params.set('character', worldCharacterId)
  const value = params.toString()
  return value ? `?${value}` : ''
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
  const campaignId =
    typeof requested.campaign === 'string' ? requested.campaign : undefined
  const worldCharacterId = requestedCharacterContext(requested.character)
  const workspace = await getWorldEntityBrowseWorkspace(
    worldId,
    user.id,
    campaignId,
  )
  if (!workspace) notFound()

  const backHref = workspace.contextCampaign
    ? withCharacterContext(
        `/world/${worldId}/campaign/${workspace.contextCampaign.id}`,
        worldCharacterId,
      )
    : `/world/${worldId}`

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: { label: workspace.world.name, href: `/world/${worldId}` },
        ...(workspace.contextCampaign
          ? {
              campaign: {
                label: workspace.contextCampaign.name,
                href: backHref,
              },
            }
          : {}),
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
              <Link
                className={styles.primaryButton}
                href={`/world/${worldId}/entities/create${campaignQuery(campaignId, worldCharacterId)}`}
              >
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
        <EntityBrowser
          worldId={worldId}
          campaignId={campaignId}
          worldCharacterId={worldCharacterId}
          entities={workspace.entities}
        />
      </AppPage>
    </AuthenticatedAppShell>
  )
}
