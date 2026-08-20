import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { StatusPanel } from '@/components/ui/status-panel'
import { uiAssets } from '@/lib/ui-assets'
import {
  campaignRoleLabel,
  worldAccessLabel,
  worldRoleLabel,
} from '@/lib/role-labels'
import { membershipInvitationService } from '@/server/invitations'
import {
  getWorldOverview,
  listWorldMembershipsForManagement,
  WORLD_ROLES,
} from '@/server/worlds'
import { ClaimWorldButton } from '../_components/claim-world-button'
import { WorldCampaignPinButton } from '../_components/world-campaign-pin-button'
import { WorldInviteDialog } from '../_components/world-invite-dialog'
import { loadWorldPageUser } from '../_lib/load-world-user'
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

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
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

  const [worldInvitations, worldMembers] = world.canManageMembers
    ? await Promise.all([
        membershipInvitationService.listWorldInvitations({
          actorUserId: user.id,
          worldId: world.id,
        }),
        listWorldMembershipsForManagement(world.id, user.id),
      ])
    : [[], null]
  const weaverMode = query.mode === 'weaver'
  const recentCampaigns = world.campaigns.slice(0, 3)
  const memberPreview = (worldMembers ?? []).slice(
    0,
    world.accessKind === 'OWNER' ? 2 : 3,
  )
  const activeInviteCount = world.canManageMembers
    ? worldInvitations.length
    : null

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
      <main className={styles.dashboard}>
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

        <div className={styles.dashboardGrid}>
          <div className={styles.dashboardMain}>
            <section className={styles.hero}>
              <Image
                className={styles.heroImage}
                src={uiAssets.fallbacks.world}
                alt=""
                fill
                priority
                sizes="(max-width: 900px) 100vw, 72vw"
              />
              <span className={styles.heroShade} aria-hidden="true" />
              <div className={styles.heroContent}>
                <span className={styles.eyebrow}>
                  {worldAccessLabel(world.accessKind)}
                </span>
                <h1>{world.name}</h1>
                <p>
                  {world.description ||
                    'A World waiting for places, people, histories, and Campaigns to be woven into it.'}
                </p>
              </div>

              <div className={styles.statGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statIcon} aria-hidden="true">
                    ⚔
                  </span>
                  <span>
                    <small>Campaigns</small>
                    <strong>{world.campaigns.length}</strong>
                    <em>Accessible</em>
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statIcon} aria-hidden="true">
                    ◉
                  </span>
                  <span>
                    <small>Members</small>
                    <strong>{world.memberCount}</strong>
                    <em>Total</em>
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statIcon} aria-hidden="true">
                    ✉
                  </span>
                  <span>
                    <small>Active invites</small>
                    <strong>{activeInviteCount ?? '—'}</strong>
                    <em>{activeInviteCount === null ? 'Restricted' : 'Open'}</em>
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statIcon} aria-hidden="true">
                    ◫
                  </span>
                  <span>
                    <small>Entities</small>
                    <strong>{world.entityCount ?? '—'}</strong>
                    <em>{world.entityCount === null ? 'Restricted' : 'Tracked'}</em>
                  </span>
                </div>
              </div>
            </section>

            <section className={styles.dashboardPanel}>
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
                    Browse campaigns
                  </Link>
                  {world.canCreateCampaign ? (
                    <Link
                      className={styles.smallPrimary}
                      href={`/world/${world.id}/campaign/create`}
                    >
                      + Create campaign
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
                      Create the first campaign
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
                            sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 24vw"
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

            {world.canManageMembers ? (
              <section className={`${styles.dashboardPanel} ${styles.membersPanel}`}>
                <div className={styles.sectionHeader}>
                  <div>
                    <span className={styles.sectionKicker}>Access</span>
                    <h2>World members</h2>
                  </div>
                  <Link
                    className={styles.smallSecondary}
                    href={`/world/${world.id}/members`}
                  >
                    Manage
                  </Link>
                </div>
                <div className={styles.memberList}>
                  {world.accessKind === 'OWNER' ? (
                    <div className={styles.memberRow}>
                      <span className={styles.memberAvatar}>YOU</span>
                      <span className={styles.memberIdentity}>
                        <strong>You</strong>
                        <small>World owner</small>
                      </span>
                      <span className={styles.memberRole}>Owner</span>
                    </div>
                  ) : null}
                  {memberPreview.map((member) => {
                    const displayName = member.displayName || member.username
                    return (
                      <div className={styles.memberRow} key={member.userId}>
                        <span className={styles.memberAvatar}>
                          {initials(displayName) || '•'}
                        </span>
                        <span className={styles.memberIdentity}>
                          <strong>{displayName}</strong>
                          <small>@{member.username}</small>
                        </span>
                        <span className={styles.memberRole}>
                          {worldRoleLabel(member.role)}
                        </span>
                      </div>
                    )
                  })}
                  {world.memberCount > memberPreview.length + (world.accessKind === 'OWNER' ? 1 : 0) ? (
                    <Link
                      className={styles.moreMembers}
                      href={`/world/${world.id}/members`}
                    >
                      View all {world.memberCount} members
                    </Link>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <aside className={styles.sidebar}>
            <section className={styles.sidebarPanel}>
              <span className={styles.sidebarTitle}>World actions</span>
              <div className={styles.actionList}>
                <Link
                  className={styles.actionItem}
                  href={weaverMode ? '/world?mode=weaver' : '/world'}
                >
                  <span className={styles.actionIcon} aria-hidden="true">
                    ◎
                  </span>
                  <span>
                    <strong>Change World</strong>
                    <small>Switch to a different World</small>
                  </span>
                  <span className={styles.actionArrow} aria-hidden="true">
                    ›
                  </span>
                </Link>

                <div
                  className={`${styles.actionItem} ${styles.actionDisabled}`}
                  aria-disabled="true"
                >
                  <span className={styles.actionIcon} aria-hidden="true">
                    ◇
                  </span>
                  <span>
                    <strong>Open World map</strong>
                    <small>Planned World map workspace</small>
                  </span>
                  <span className={styles.actionArrow}>Soon</span>
                </div>

                {world.canManageMembers ? (
                  <Link
                    className={styles.actionItem}
                    href={`/world/${world.id}/members`}
                  >
                    <span className={styles.actionIcon} aria-hidden="true">
                      ◉
                    </span>
                    <span>
                      <strong>Manage members</strong>
                      <small>View roles and World access</small>
                    </span>
                    <span className={styles.actionArrow} aria-hidden="true">
                      ›
                    </span>
                  </Link>
                ) : null}

                {world.canManageMembers ? (
                  <WorldInviteDialog
                    endpoint={`/api/v1/worlds/${world.id}/invitations`}
                    roles={WORLD_ROLES}
                    initialInvitations={worldInvitations.map((invitation) => ({
                      id: invitation.id,
                      role: invitation.role,
                      expiresAt: invitation.expiresAt.toISOString(),
                    }))}
                  />
                ) : null}

                {world.canEditBasicInfo ? (
                  <Link
                    className={styles.actionItem}
                    href={`/world/${world.id}/settings`}
                  >
                    <span className={styles.actionIcon} aria-hidden="true">
                      ⚙
                    </span>
                    <span>
                      <strong>World settings</strong>
                      <small>Configure World information</small>
                    </span>
                    <span className={styles.actionArrow} aria-hidden="true">
                      ›
                    </span>
                  </Link>
                ) : null}
              </div>
            </section>

            <section className={styles.sidebarPanel}>
              <span className={styles.sidebarTitle}>World overview</span>
              <div className={styles.overviewList}>
                <Link
                  className={styles.overviewItem}
                  href={`/world/${world.id}/entities`}
                >
                  <span className={styles.overviewIcon} aria-hidden="true">
                    ◫
                  </span>
                  <span>
                    <strong>Entities</strong>
                    <small>
                      {world.entityCount === null
                        ? 'Browse World content visible to you.'
                        : `${world.entityCount} tracked across this World.`}
                    </small>
                  </span>
                  <span aria-hidden="true">›</span>
                </Link>
                <div className={`${styles.overviewItem} ${styles.overviewDisabled}`}>
                  <span className={styles.overviewIcon} aria-hidden="true">
                    ⇄
                  </span>
                  <span>
                    <strong>Timeline</strong>
                    <small>World history and eras.</small>
                  </span>
                  <span>Soon</span>
                </div>
                <div className={`${styles.overviewItem} ${styles.overviewDisabled}`}>
                  <span className={styles.overviewIcon} aria-hidden="true">
                    ◧
                  </span>
                  <span>
                    <strong>Lore & history</strong>
                    <small>Stories and setting knowledge.</small>
                  </span>
                  <span>Soon</span>
                </div>
                <div className={`${styles.overviewItem} ${styles.overviewDisabled}`}>
                  <span className={styles.overviewIcon} aria-hidden="true">
                    ⌖
                  </span>
                  <span>
                    <strong>Key locations</strong>
                    <small>Places and regions in the World.</small>
                  </span>
                  <span>Soon</span>
                </div>
              </div>
            </section>

            {world.hasFullWorldAccess ? (
              <section className={styles.sidebarPanel}>
                <div className={styles.detailsHeader}>
                  <span className={styles.sidebarTitle}>World details</span>
                  {world.canEditBasicInfo ? (
                    <Link
                      className={styles.tinyButton}
                      href={`/world/${world.id}/settings`}
                    >
                      Edit
                    </Link>
                  ) : null}
                </div>
                <dl className={styles.detailsList}>
                  <div>
                    <dt>World name</dt>
                    <dd>{world.name}</dd>
                  </div>
                  <div>
                    <dt>Description</dt>
                    <dd>{world.description || 'No description yet.'}</dd>
                  </div>
                </dl>
              </section>
            ) : null}
          </aside>
        </div>
      </main>
    </AuthenticatedAppShell>
  )
}
