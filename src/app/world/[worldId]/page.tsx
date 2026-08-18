import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { StatusPanel } from '@/components/ui/status-panel'
import { getWorldOverview } from '@/server/worlds'
import { ClaimWorldButton } from '../_components/claim-world-button'
import { WorldForm } from '../_components/world-form'
import { loadWorldPageUser } from '../_lib/load-world-user'
import styles from '../world.module.css'

const accessLabels = {
  OWNER: 'World owner',
  ADMIN: 'World admin',
  MEMBER: 'World member',
  VIEWER: 'World viewer',
  CAMPAIGN_ONLY: 'Campaign-only World access',
} as const

interface WorldOverviewPageProps {
  params: Promise<{ worldId: string }>
  searchParams: Promise<{ mode?: string | string[] }>
}

export default async function WorldOverviewPage({
  params,
  searchParams,
}: WorldOverviewPageProps) {
  const [{ worldId }, query, user] = await Promise.all([
    params,
    searchParams,
    loadWorldPageUser(),
  ])
  const world = await getWorldOverview(worldId, user.id)
  if (!world) notFound()
  const weaverMode = query.mode === 'weaver'

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: {
          label: world.name,
          href: weaverMode
            ? `/world/${world.id}?mode=weaver`
            : `/world/${world.id}`,
        },
      }}
    >
      <AppPage
        eyebrow={accessLabels[world.accessKind]}
        title={world.name}
        description={
          world.hasFullWorldAccess
            ? world.description || 'No World description has been added yet.'
            : 'You can navigate this World through one or more Campaigns. World content is filtered by your Campaign and visibility access.'
        }
        wide
        actions={
          <Link
            className={styles.secondary}
            href={weaverMode ? '/world?mode=weaver' : '/world'}
          >
            Change World
          </Link>
        }
      >
        <div className={styles.stack}>
          {world.accessKind === 'CAMPAIGN_ONLY' ? (
            <div className={styles.notice}>
              Campaign-only access does not grant general World editing or
              unrestricted World-content access.
            </div>
          ) : null}

          {world.orphaned ? (
            <StatusPanel
              tone="empty"
              title="This World currently has no owner"
              action={
                world.canClaimOwnership ? (
                  <ClaimWorldButton worldId={world.id} />
                ) : undefined
              }
            >
              <p>
                Existing Campaigns and World relationships remain intact.
                Ownership can only be claimed when the backend lifecycle rules
                allow it.
              </p>
            </StatusPanel>
          ) : null}

          <div className={styles.infoGrid}>
            <section className={styles.panel}>
              <h2>Campaigns you can access</h2>
              {world.campaigns.length === 0 ? (
                <p className={styles.meta}>
                  No accessible Campaigns in this World yet.
                </p>
              ) : (
                <div className={styles.campaignList}>
                  {world.campaigns.map((campaign) => {
                    const manageableCampaign =
                      campaign.isOwner ||
                      campaign.role === 'GM' ||
                      campaign.role === 'ASSISTANT_GM'
                    const trackAsWeaver = weaverMode && manageableCampaign

                    return (
                      <TrackedEntryLink
                        className={styles.campaign}
                        key={campaign.id}
                        href={`/world/${world.id}/campaign/${campaign.id}${trackAsWeaver ? '?mode=weaver' : ''}`}
                        tracking={
                          trackAsWeaver
                            ? {
                                kind: 'WEAVER',
                                worldId: world.id,
                                campaignId: campaign.id,
                              }
                            : undefined
                        }
                      >
                        <strong>{campaign.name}</strong>
                        <span className={styles.meta}>
                          {campaign.isOwner ? 'Owner · ' : ''}
                          {campaign.role}
                        </span>
                      </TrackedEntryLink>
                    )
                  })}
                </div>
              )}
              <div className={styles.formActions}>
                <Link
                  className={styles.secondary}
                  href={`/world/${world.id}/campaign${weaverMode ? '?mode=weaver' : ''}`}
                >
                  Browse Campaigns
                </Link>
                {world.canCreateCampaign ? (
                  <Link
                    className={styles.secondary}
                    href={`/world/${world.id}/campaign/create`}
                  >
                    Create Campaign
                  </Link>
                ) : null}
              </div>
            </section>

            <section className={styles.panel}>
              <h2>World context</h2>
              <p className={styles.meta}>Entities and timeline</p>
              <p>
                Browse interconnected World entities now. Basic World history
                and main-timeline facts are tracked separately in #113.
              </p>
              <div className={styles.formActions}>
                <Link
                  className={styles.secondary}
                  href={`/world/${world.id}/entities`}
                >
                  Browse World entities
                </Link>
              </div>
            </section>
          </div>

          {world.canEditBasicInfo ? (
            <section className={styles.panel}>
              <h2>Edit World information</h2>
              <WorldForm
                mode="edit"
                worldId={world.id}
                initialName={world.name}
                initialDescription={world.description}
              />
            </section>
          ) : null}
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
