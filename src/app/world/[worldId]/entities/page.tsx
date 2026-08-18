import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { getWorldEntityWorkspace } from '@/server/world-entities'
import { loadWorldPageUser } from '../../_lib/load-world-user'
import { EntityBrowser } from './_components/entity-browser'
import { EntityTypeManager } from './_components/entity-type-manager'
import styles from './entity.module.css'

interface WorldEntitiesPageProps {
  params: Promise<{ worldId: string }>
  searchParams: Promise<{ campaign?: string | string[] }>
}

function query(campaignId?: string) {
  return campaignId ? `?campaign=${campaignId}` : ''
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
  const workspace = await getWorldEntityWorkspace(worldId, user.id, campaignId)
  if (!workspace) notFound()

  const backHref = workspace.contextCampaign
    ? `/world/${worldId}/campaign/${workspace.contextCampaign.id}`
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
                href: `/world/${worldId}/campaign/${workspace.contextCampaign.id}`,
              },
            }
          : {}),
      }}
    >
      <AppPage
        eyebrow={workspace.contextCampaign ? 'Campaign World view' : 'Worldbuilding'}
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
              {workspace.contextCampaign ? 'Back to Campaign' : 'World overview'}
            </Link>
            {workspace.canEditContent ? (
              <EntityTypeManager worldId={worldId} types={workspace.entityTypes} />
            ) : null}
            {workspace.canEditContent ? (
              <Link
                className={styles.primaryButton}
                href={`/world/${worldId}/entities/create${query(campaignId)}`}
              >
                Create entity
              </Link>
            ) : null}
          </>
        }
      >
        {workspace.world.accessKind === 'CAMPAIGN_ONLY' ? (
          <div className={styles.notice}>
            Campaign-only access does not grant unrestricted World browsing. This
            list contains only content visible through your Campaign role or
            targeted visibility.
          </div>
        ) : null}
        <EntityBrowser
          worldId={worldId}
          campaignId={campaignId}
          entities={workspace.entities}
        />
      </AppPage>
    </AuthenticatedAppShell>
  )
}
