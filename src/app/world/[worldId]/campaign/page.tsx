import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { StatusPanel } from '@/components/ui/status-panel'
import { campaignRoleLabel } from '@/lib/role-labels'
import { uiAssets } from '@/lib/ui-assets'
import { requireAuthenticatedUser } from '@/server/auth'
import { getWorldCampaignSelection } from '@/server/campaigns'
import {
  listEntryPreferences,
  WEAVER_CAMPAIGN_ENTRY_KEY_PREFIX,
  WEAVER_ENTRY_KEY,
} from '@/server/selection'
import { SelectLogoutButton } from '@/app/select/_components/select-logout-button'
import { CinematicEntryBrowser } from '../../_components/cinematic-entry-browser'
import { WeaverFavoriteButton } from '../../_components/weaver-favorite-button'
import styles from './campaign.module.css'
import weaverStyles from './weaver-campaign-selector.module.css'
import actionStyles from '../../weaver-selector-actions.module.css'

interface CampaignSelectionPageProps {
  params: Promise<{ worldId: string }>
  searchParams: Promise<{
    mode?: string | string[]
    show?: string | string[]
  }>
}

function canWeaveCampaign(campaign: {
  isOwner: boolean
  role: 'OWNER' | 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'
}) {
  return (
    campaign.isOwner ||
    campaign.role === 'GM' ||
    campaign.role === 'ASSISTANT_GM'
  )
}

function compareFavoriteThenRecent(
  left: { name: string; pinned: boolean; lastUsedAt: Date | null },
  right: { name: string; pinned: boolean; lastUsedAt: Date | null },
) {
  if (left.pinned !== right.pinned) return left.pinned ? -1 : 1

  const recentDifference =
    (right.lastUsedAt?.getTime() ?? 0) - (left.lastUsedAt?.getTime() ?? 0)
  if (recentDifference !== 0) return recentDifference
  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
}

export default async function CampaignSelectionPage({
  params,
  searchParams,
}: CampaignSelectionPageProps) {
  const [{ worldId }, query, user] = await Promise.all([
    params,
    searchParams,
    requireAuthenticatedUser(new Headers(await headers())),
  ])
  const [selection, entryPreferences] = await Promise.all([
    getWorldCampaignSelection(worldId, user.id),
    listEntryPreferences(user.id),
  ])
  if (!selection) notFound()
  const weaverMode = query.mode === 'weaver'
  const threadwatcherMode = query.mode === 'threadwatcher'
  const launcherMode = weaverMode || threadwatcherMode
  const campaigns = threadwatcherMode
    ? selection.campaigns.filter((campaign) => campaign.role === 'SPECTATOR')
    : weaverMode
      ? selection.campaigns.filter(canWeaveCampaign)
      : selection.campaigns
  const showAllLauncherCampaigns = launcherMode && query.show === 'all'

  const specificWeaverPreferences = new Map(
    entryPreferences
      .filter(
        (preference) =>
          preference.kind === 'WEAVER' &&
          preference.worldId === worldId &&
          preference.campaignId &&
          preference.entryKey.startsWith(
            `${WEAVER_CAMPAIGN_ENTRY_KEY_PREFIX}:`,
          ),
      )
      .map((preference) => [preference.campaignId as string, preference]),
  )
  const resumePreference = entryPreferences.find(
    (preference) =>
      preference.kind === 'WEAVER' &&
      preference.entryKey === WEAVER_ENTRY_KEY &&
      preference.worldId === worldId,
  )
  const launcherCampaigns = campaigns.map((campaign) => {
    const preference = specificWeaverPreferences.get(campaign.id)
    const resumeFallback =
      !preference && resumePreference?.campaignId === campaign.id
        ? resumePreference
        : null

    return {
      ...campaign,
      pinned: preference?.pinned ?? false,
      lastUsedAt: preference?.lastUsedAt ?? resumeFallback?.lastUsedAt ?? null,
    }
  })
  const orderedLauncherCampaigns = weaverMode
    ? [...launcherCampaigns].sort(compareFavoriteThenRecent)
    : launcherCampaigns
  const featuredCampaigns = orderedLauncherCampaigns.slice(0, 3)

  if (launcherMode) {
    const roleLabel = weaverMode ? 'Weaver' : 'Threadwatcher'
    const mode = weaverMode ? 'weaver' : 'threadwatcher'

    return (
      <AuthenticatedAppShell user={user} variant="launcher">
        <section
          className={weaverStyles.stage}
          aria-label={`Choose a Campaign as ${roleLabel}`}
          data-cinematic-selector="true"
          data-browse={showAllLauncherCampaigns ? 'true' : 'false'}
        >
          <div className={weaverStyles.background} aria-hidden="true">
            <Image
              src={uiAssets.select.backgroundDesktop.src}
              alt=""
              fill
              priority
              sizes="100vw"
              className={weaverStyles.backgroundImage}
            />
          </div>
          <div className={weaverStyles.backgroundVeil} aria-hidden="true" />
          <SelectLogoutButton />

          <div className={weaverStyles.inner}>
            <div className={weaverStyles.topbar}>
              <Link
                className={weaverStyles.backLink}
                href={`/world?mode=${mode}`}
              >
                <span aria-hidden="true">←</span>
                <span>Choose another World</span>
              </Link>
            </div>

            {showAllLauncherCampaigns ? (
              <CinematicEntryBrowser
                kind="campaign"
                roleLabel={roleLabel}
                closeHref={`/world/${worldId}/campaign?mode=${mode}`}
                favoritesEnabled={weaverMode}
                initialSort={weaverMode ? 'recent' : 'az'}
                entries={orderedLauncherCampaigns.map((campaign) => ({
                  id: campaign.id,
                  name: campaign.name,
                  kicker: campaignRoleLabel(campaign.role),
                  meta:
                    campaign.status === 'ACTIVE'
                      ? 'Active Campaign'
                      : campaign.status === 'ENDED'
                        ? 'Ended Campaign'
                        : 'Archived Campaign',
                  href: `/world/${worldId}/campaign/${campaign.id}?mode=${mode}`,
                  backgroundImage: uiAssets.fallbacks.campaign,
                  filterValue: campaign.status,
                  lastUsedAt: weaverMode
                    ? (campaign.lastUsedAt?.toISOString() ?? null)
                    : null,
                  favorite: weaverMode ? campaign.pinned : false,
                  favoriteTarget: weaverMode
                    ? { worldId, campaignId: campaign.id }
                    : undefined,
                  tracking: weaverMode
                    ? {
                        kind: 'WEAVER' as const,
                        worldId,
                        campaignId: campaign.id,
                      }
                    : undefined,
                }))}
              />
            ) : (
              <>
                <div className={weaverStyles.intro}>
                  <span className={weaverStyles.eyebrow}>
                    Enter as {roleLabel} · {selection.world.name}
                  </span>
                  <h1>Choose a Campaign</h1>
                  <span className={weaverStyles.introRule} aria-hidden="true" />
                  <p>
                    {weaverMode
                      ? `Choose the story you want to continue shaping in ${selection.world.name}.`
                      : `Choose the story you want to observe in ${selection.world.name}.`}
                  </p>
                </div>

                {campaigns.length === 0 ? (
                  <div className={weaverStyles.emptyState}>
                    <span className={weaverStyles.emptyKicker}>
                      {weaverMode
                        ? 'No active weave'
                        : 'Nothing to observe yet'}
                    </span>
                    <strong>
                      {weaverMode
                        ? 'No Weaver Campaigns in this World'
                        : 'No Threadwatcher Campaigns in this World'}
                    </strong>
                    <p>
                      {weaverMode
                        ? 'You do not currently own or manage a Campaign in this World.'
                        : 'You do not currently have Threadwatcher access to a Campaign in this World.'}
                    </p>
                    {weaverMode && selection.canCreateCampaign ? (
                      <Link
                        className={weaverStyles.emptyAction}
                        href={`/world/${worldId}/campaign/create`}
                      >
                        Create Campaign
                      </Link>
                    ) : (
                      <Link
                        className={weaverStyles.emptyAction}
                        href={`/world?mode=${mode}`}
                      >
                        Choose another World
                      </Link>
                    )}
                  </div>
                ) : (
                  <>
                    <div className={weaverStyles.campaignGrid}>
                      {featuredCampaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          style={{ position: 'relative', minWidth: 0 }}
                        >
                          <TrackedEntryLink
                            className={weaverStyles.campaignCard}
                            href={`/world/${worldId}/campaign/${campaign.id}?mode=${mode}`}
                            tracking={
                              weaverMode
                                ? {
                                    kind: 'WEAVER',
                                    worldId,
                                    campaignId: campaign.id,
                                  }
                                : undefined
                            }
                            style={{
                              backgroundImage: `url(${uiAssets.fallbacks.campaign})`,
                            }}
                          >
                            <span className={weaverStyles.cardCopy}>
                              <span className={weaverStyles.cardKicker}>
                                {campaignRoleLabel(campaign.role)}
                              </span>
                              <strong>{campaign.name}</strong>
                              <span className={weaverStyles.meta}>
                                {campaign.status === 'ACTIVE'
                                  ? 'Active Campaign'
                                  : campaign.status === 'ENDED'
                                    ? 'Ended Campaign'
                                    : 'Archived Campaign'}
                              </span>
                              <span className={weaverStyles.cardAction}>
                                <span>Enter as {roleLabel}</span>
                                <span aria-hidden="true">›</span>
                              </span>
                            </span>
                          </TrackedEntryLink>

                          {weaverMode ? (
                            <WeaverFavoriteButton
                              worldId={worldId}
                              campaignId={campaign.id}
                              pinned={campaign.pinned}
                              label="Campaign"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className={actionStyles.selectorActions}>
                      {campaigns.length > 3 ? (
                        <Link
                          className={actionStyles.browseLink}
                          href={`/world/${worldId}/campaign?mode=${mode}&show=all`}
                        >
                          <span>Browse all Campaigns ({campaigns.length})</span>
                          <span aria-hidden="true">›</span>
                        </Link>
                      ) : null}

                      {weaverMode && selection.canCreateCampaign ? (
                        <>
                          <span className={actionStyles.alternativeLabel}>
                            Or begin a new story
                          </span>
                          <Link
                            className={actionStyles.primaryCreate}
                            href={`/world/${worldId}/campaign/create`}
                          >
                            <Image
                              src={uiAssets.ui.frames.goldPrimaryAction}
                              alt=""
                              fill
                              sizes="340px"
                              className={actionStyles.primaryFrame}
                            />
                            <span>Create Campaign</span>
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </AuthenticatedAppShell>
    )
  }

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: {
          label: selection.world.name,
          href: `/world/${worldId}`,
        },
      }}
    >
      <AppPage
        eyebrow="Campaigns"
        title="Choose a Campaign"
        description={`Choose a Campaign you can access in ${selection.world.name}.`}
        wide
        actions={
          selection.canCreateCampaign ? (
            <Link
              className={styles.secondary}
              href={`/world/${worldId}/campaign/create`}
            >
              Create Campaign
            </Link>
          ) : null
        }
      >
        {campaigns.length === 0 ? (
          <StatusPanel
            tone="empty"
            title="No accessible Campaigns"
            action={
              selection.canCreateCampaign ? (
                <Link
                  className={styles.secondary}
                  href={`/world/${worldId}/campaign/create`}
                >
                  Create Campaign
                </Link>
              ) : undefined
            }
          >
            <p>You do not currently have access to a Campaign in this World.</p>
          </StatusPanel>
        ) : (
          <div className={styles.grid}>
            {campaigns.map((campaign) => (
              <TrackedEntryLink
                key={campaign.id}
                className={styles.card}
                href={`/world/${worldId}/campaign/${campaign.id}`}
              >
                <span className={styles.badge}>
                  {campaignRoleLabel(campaign.role)}
                </span>
                <strong>{campaign.name}</strong>
                <span className={styles.meta}>
                  {campaign.isOwner ? 'Owner · ' : ''}
                  {campaign.status}
                </span>
              </TrackedEntryLink>
            ))}
          </div>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
