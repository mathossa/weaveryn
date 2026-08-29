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
import styles from './campaign.module.css'
import weaverStyles from './weaver-campaign-selector.module.css'

interface CampaignSelectionPageProps {
  params: Promise<{ worldId: string }>
  searchParams: Promise<{ mode?: string | string[] }>
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

export default async function CampaignSelectionPage({
  params,
  searchParams,
}: CampaignSelectionPageProps) {
  const [{ worldId }, query, user] = await Promise.all([
    params,
    searchParams,
    requireAuthenticatedUser(new Headers(await headers())),
  ])
  const selection = await getWorldCampaignSelection(worldId, user.id)
  if (!selection) notFound()
  const weaverMode = query.mode === 'weaver'
  const threadwatcherMode = query.mode === 'threadwatcher'
  const campaigns = threadwatcherMode
    ? selection.campaigns.filter((campaign) => campaign.role === 'SPECTATOR')
    : weaverMode
      ? selection.campaigns.filter(canWeaveCampaign)
      : selection.campaigns

  if (weaverMode) {
    return (
      <AuthenticatedAppShell user={user} variant="launcher">
        <section
          className={weaverStyles.stage}
          aria-label="Choose a Campaign as Weaver"
          aria-labelledby="weaver-campaign-title"
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

          <div className={weaverStyles.inner}>
            <div className={weaverStyles.topbar}>
              <Link className={weaverStyles.backLink} href="/world?mode=weaver">
                <span aria-hidden="true">←</span>
                <span>Choose another World</span>
              </Link>
              {selection.canCreateCampaign ? (
                <Link
                  className={weaverStyles.createLink}
                  href={`/world/${worldId}/campaign/create`}
                >
                  <span aria-hidden="true">＋</span>
                  <span>Create Campaign</span>
                </Link>
              ) : null}
            </div>

            <div className={weaverStyles.intro}>
              <span className={weaverStyles.eyebrow}>
                Enter as Weaver · {selection.world.name}
              </span>
              <h1 id="weaver-campaign-title">Choose a Campaign</h1>
              <span className={weaverStyles.introRule} aria-hidden="true" />
              <p>
                Choose the story you want to continue shaping in{' '}
                {selection.world.name}.
              </p>
            </div>

            {campaigns.length === 0 ? (
              <div className={weaverStyles.emptyState}>
                <span className={weaverStyles.emptyKicker}>No active weave</span>
                <strong>No Weaver Campaigns in this World</strong>
                <p>
                  You do not currently own or manage a Campaign in this World.
                </p>
                {selection.canCreateCampaign ? (
                  <Link
                    className={weaverStyles.emptyAction}
                    href={`/world/${worldId}/campaign/create`}
                  >
                    Create Campaign
                  </Link>
                ) : (
                  <Link
                    className={weaverStyles.emptyAction}
                    href="/world?mode=weaver"
                  >
                    Choose another World
                  </Link>
                )}
              </div>
            ) : (
              <div className={weaverStyles.campaignGrid}>
                {campaigns.map((campaign) => (
                  <TrackedEntryLink
                    key={campaign.id}
                    className={weaverStyles.campaignCard}
                    href={`/world/${worldId}/campaign/${campaign.id}?mode=weaver`}
                    tracking={{
                      kind: 'WEAVER',
                      worldId,
                      campaignId: campaign.id,
                    }}
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
                        <span>Enter as Weaver</span>
                        <span aria-hidden="true">›</span>
                      </span>
                    </span>
                  </TrackedEntryLink>
                ))}
              </div>
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
          href: threadwatcherMode
            ? '/world?mode=threadwatcher'
            : `/world/${worldId}`,
        },
      }}
    >
      <AppPage
        eyebrow={threadwatcherMode ? 'Threadwatcher' : 'Campaigns'}
        title="Choose a Campaign"
        description={
          threadwatcherMode
            ? `Choose a Campaign in ${selection.world.name} that you can observe as a Threadwatcher.`
            : `Choose a Campaign you can access in ${selection.world.name}.`
        }
        wide
        actions={
          !threadwatcherMode && selection.canCreateCampaign ? (
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
            title={
              threadwatcherMode
                ? 'No Threadwatcher Campaigns in this World'
                : 'No accessible Campaigns'
            }
            action={
              threadwatcherMode ? (
                <Link
                  className={styles.secondary}
                  href="/world?mode=threadwatcher"
                >
                  Change World
                </Link>
              ) : selection.canCreateCampaign ? (
                <Link
                  className={styles.secondary}
                  href={`/world/${worldId}/campaign/create`}
                >
                  Create Campaign
                </Link>
              ) : undefined
            }
          >
            <p>
              {threadwatcherMode
                ? 'You do not currently have Threadwatcher membership in a Campaign hosted by this World.'
                : 'You do not currently have access to a Campaign in this World.'}
            </p>
          </StatusPanel>
        ) : (
          <div className={styles.grid}>
            {campaigns.map((campaign) => {
              const modeQuery = threadwatcherMode ? '?mode=threadwatcher' : ''

              return (
                <TrackedEntryLink
                  key={campaign.id}
                  className={styles.card}
                  href={`/world/${worldId}/campaign/${campaign.id}${modeQuery}`}
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
              )
            })}
          </div>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
