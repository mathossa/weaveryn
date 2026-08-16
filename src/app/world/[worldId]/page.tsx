import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { requireAuthenticatedUser } from '@/server/auth'
import { getWorldOverview } from '@/server/worlds'
import { ClaimWorldButton } from '../_components/claim-world-button'
import { WorldForm } from '../_components/world-form'
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
}

export default async function WorldOverviewPage({ params }: WorldOverviewPageProps) {
  const [{ worldId }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(new Headers(await headers())),
  ])
  const world = await getWorldOverview(worldId, user.id)
  if (!world) notFound()

  return (
    <AuthenticatedAppShell
      user={user}
      context={{ world: { label: world.name, href: `/world/${world.id}` } }}
    >
      <AppPage
        eyebrow={accessLabels[world.accessKind]}
        title={world.name}
        description={
          world.hasFullWorldAccess
            ? world.description || 'No World description has been added yet.'
            : 'You can navigate this World through one or more Campaigns. World content visibility will be resolved through Campaign timeline and visibility rules as those content views are implemented.'
        }
        wide
        actions={
          <Link className={styles.secondary} href="/world">
            Change World
          </Link>
        }
      >
        <div className={styles.stack}>
          {world.accessKind === 'CAMPAIGN_ONLY' ? (
            <div className={styles.notice}>
              Campaign-only access does not grant general World editing or unrestricted World-content access.
            </div>
          ) : null}

          {world.orphaned ? (
            <StatusPanel
              tone="empty"
              title="This World currently has no owner"
              action={world.canClaimOwnership ? <ClaimWorldButton worldId={world.id} /> : undefined}
            >
              <p>
                Existing Campaigns and World relationships remain intact. Ownership can only be claimed when the backend lifecycle rules allow it.
              </p>
            </StatusPanel>
          ) : null}

          <div className={styles.infoGrid}>
            <section className={styles.panel}>
              <h2>Campaigns you can access</h2>
              {world.campaigns.length === 0 ? (
                <p className={styles.meta}>No accessible Campaigns in this World yet.</p>
              ) : (
                <div className={styles.campaignList}>
                  {world.campaigns.map((campaign) => (
                    <div className={styles.campaign} key={campaign.id}>
                      <strong>{campaign.name}</strong>
                      <span className={styles.meta}>{campaign.role}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className={styles.meta}>
                Campaign overview navigation will connect here in #53.
              </p>
            </section>

            <section className={styles.panel}>
              <h2>World context</h2>
              <p className={styles.meta}>Entities and timeline</p>
              <p>
                World entities and timeline-aware content will connect here when their dedicated UI is implemented.
              </p>
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
