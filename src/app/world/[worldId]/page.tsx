import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { StatusPanel } from '@/components/ui/status-panel'
import { uiAssets } from '@/lib/ui-assets'
import { campaignRoleLabel, worldAccessLabel } from '@/lib/role-labels'
import { getWorldOverview } from '@/server/worlds'
import { ClaimWorldButton } from '../_components/claim-world-button'
import { WorldCampaignPinButton } from '../_components/world-campaign-pin-button'
import { loadWorldPageUser } from '../_lib/load-world-user'
import dashboardStyles from '../world-dashboard.module.css'
import styles from '../world.module.css'

interface WorldOverviewPageProps {
  params: Promise<{ worldId: string }>
  searchParams: Promise<{ mode?: string | string[] }>
}

function lastOpenedLabel(value: Date | null) {
  if (!value) return 'Not opened yet'
  const elapsed = Math.max(0, Date.now() - value.getTime())
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return 'Opened just now'
  if (minutes < 60) return `Opened ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Opened ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Opened yesterday'
  if (days < 30) return `Opened ${days}d ago`
  return `Opened ${new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(value)}`
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
  const recentCampaigns = world.campaigns.slice(0, 3)

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
      <main className={dashboardStyles.worldHome}>
        {world.accessKind === 'CAMPAIGN_ONLY' ? (
          <div className={styles.notice}>
            Campaign-only access does not make you a World member. Only content
            available through your Campaigns is shown here.
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
              Existing Campaigns and World relationships remain intact while
              ownership is unresolved.
            </p>
          </StatusPanel>
        ) : null}

        <section className={`${styles.hero} ${dashboardStyles.atlasHero}`}>
          <Image
            className={styles.heroImage}
            src={uiAssets.fallbacks.world}
            alt=""
            fill
            priority
            sizes="100vw"
          />
          <span className={styles.heroShade} aria-hidden="true" />
          <div className={`${styles.heroContent} ${dashboardStyles.heroCopy}`}>
            <span className={styles.eyebrow}>
              {worldAccessLabel(world.accessKind)} · World
            </span>
            <h1>{world.name}</h1>
            <p>
              {world.description ||
                'A living World waiting to be explored through its places, people, histories, and Campaigns.'}
            </p>
            <div className={dashboardStyles.heroActions}>
              <Link
                className={dashboardStyles.atlasAction}
                href={`/world/${world.id}/entities`}
              >
                Explore the World
              </Link>
              {world.hasFullWorldAccess ? (
                <Link
                  className={dashboardStyles.quietAction}
                  href={`/world/${world.id}/timeline`}
                >
                  Open timeline
                </Link>
              ) : null}
              <Link
                className={dashboardStyles.quietAction}
                href={weaverMode ? '/world?mode=weaver' : '/world'}
              >
                Change World
              </Link>
            </div>
          </div>
        </section>

        <section className={dashboardStyles.campaignSection}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionKicker}>Recent & pinned</span>
              <h2>Campaigns in this World</h2>
            </div>
            <div className={styles.compactActions}>
              <Link
                className={styles.smallSecondary}
                href={`/world/${world.id}/campaign${weaverMode ? '?mode=weaver' : ''}`}
              >
                Browse Campaigns
              </Link>
              {world.canCreateCampaign ? (
                <Link
                  className={styles.smallPrimary}
                  href={`/world/${world.id}/campaign/create`}
                >
                  Create Campaign
                </Link>
              ) : null}
            </div>
          </div>

          {recentCampaigns.length === 0 ? (
            <div className={styles.emptyCampaigns}>
              <p>No accessible Campaigns in this World yet.</p>
              {world.canCreateCampaign ? (
                <Link
                  className={styles.smallPrimary}
                  href={`/world/${world.id}/campaign/create`}
                >
                  Create the first Campaign
                </Link>
              ) : null}
            </div>
          ) : (
            <div className={styles.campaignCards}>
              {recentCampaigns.map((campaign, index) => {
                const manageableCampaign =
                  campaign.isOwner ||
                  campaign.role === 'GM' ||
                  campaign.role === 'ASSISTANT_GM'
                const trackAsWeaver = weaverMode && manageableCampaign
                return (
                  <div className={styles.campaignFrame} key={campaign.id}>
                    <TrackedEntryLink
                      className={styles.campaignCard}
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
                      ariaLabel={`Open ${campaign.name}`}
                    >
                      <Image
                        className={styles.campaignImage}
                        src={uiAssets.fallbacks.campaign}
                        alt=""
                        fill
                        sizes="(max-width: 720px) 100vw, 33vw"
                        loading={index === 0 ? 'eager' : 'lazy'}
                      />
                      <span
                        className={styles.campaignShade}
                        aria-hidden="true"
                      />
                      <span className={styles.campaignCopy}>
                        <strong>{campaign.name}</strong>
                        <span>{lastOpenedLabel(campaign.lastUsedAt)}</span>
                        <small>
                          {campaign.isOwner ? 'Owner · ' : ''}
                          {campaignRoleLabel(campaign.role)}
                        </small>
                      </span>
                    </TrackedEntryLink>
                    {trackAsWeaver ? (
                      <WorldCampaignPinButton
                        worldId={world.id}
                        campaignId={campaign.id}
                        pinned={campaign.pinned}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <nav className={dashboardStyles.worldPaths} aria-label="World paths">
          <Link href={`/world/${world.id}/entities`}>
            <span>World content</span>
            <strong>Entities</strong>
            <small>
              Browse visible people, places, items, and connections.
            </small>
          </Link>
          {world.hasFullWorldAccess ? (
            <Link href={`/world/${world.id}/timeline`}>
              <span>What happened?</span>
              <strong>Timeline</strong>
              <small>Explore canonical eras, events, and World dates.</small>
            </Link>
          ) : null}
          {world.canManageMembers ? (
            <Link href={`/world/${world.id}/members`}>
              <span>World access</span>
              <strong>Members</strong>
              <small>Manage membership, roles, and invitations.</small>
            </Link>
          ) : null}
          {world.canEditBasicInfo ? (
            <Link href={`/world/${world.id}/settings`}>
              <span>World management</span>
              <strong>Settings</strong>
              <small>Edit the World name and overview.</small>
            </Link>
          ) : null}
        </nav>
      </main>
    </AuthenticatedAppShell>
  )
}
