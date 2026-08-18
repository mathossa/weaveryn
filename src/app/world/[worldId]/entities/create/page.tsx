import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { getWorldEntityWorkspace } from '@/server/world-entities'
import { loadWorldPageUser } from '../../../_lib/load-world-user'
import { EntityForm } from '../_components/entity-form'
import styles from '../entity.module.css'

interface CreateWorldEntityPageProps {
  params: Promise<{ worldId: string }>
  searchParams: Promise<{ campaign?: string | string[] }>
}

export default async function CreateWorldEntityPage({
  params,
  searchParams,
}: CreateWorldEntityPageProps) {
  const [{ worldId }, requested, user] = await Promise.all([
    params,
    searchParams,
    loadWorldPageUser(),
  ])
  const campaignId =
    typeof requested.campaign === 'string' ? requested.campaign : undefined
  const workspace = await getWorldEntityWorkspace(worldId, user.id, campaignId)
  if (!workspace) notFound()
  const query = campaignId ? `?campaign=${campaignId}` : ''
  const selectableEntityTypes = workspace.entityTypes.filter(
    (type) => type.scope === 'BUILT_IN' || (type.usageCount ?? 0) > 0,
  )

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
        eyebrow="Worldbuilding"
        title="Create World entity"
        description={
          workspace.contextCampaign
            ? `Create shared World identity from ${workspace.contextCampaign.name}. The default audience is this Campaign, but you can change it before saving.`
            : 'Create a generic World entity. Custom free-text types become reusable in this World.'
        }
        wide
        actions={
          <Link
            className={styles.secondaryButton}
            href={`/world/${worldId}/entities${query}`}
          >
            Cancel
          </Link>
        }
      >
        {workspace.canEditContent ? (
          <div className={styles.editorScroll}>
            <EntityForm
              mode="create"
              worldId={worldId}
              contextCampaignId={campaignId}
              entityTypes={selectableEntityTypes}
              entities={workspace.entities}
              relationshipTypes={workspace.relationshipTypes}
              campaigns={workspace.campaigns}
              visibilityUsers={workspace.visibilityUsers}
            />
          </div>
        ) : (
          <StatusPanel tone="error" title="World editing permission required">
            <p>
              You can read content available to this context, but your World
              role does not permit creating World entities.
            </p>
          </StatusPanel>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
