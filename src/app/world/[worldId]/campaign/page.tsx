import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { StatusPanel } from '@/components/ui/status-panel'
import { campaignRoleLabel } from '@/lib/role-labels'
import { requireAuthenticatedUser } from '@/server/auth'
import { getWorldCampaignSelection } from '@/server/campaigns'
import styles from './campaign.module.css'

interface CampaignSelectionPageProps {
  params: Promise<{ worldId: string }>
  searchParams: Promise<{ mode?: string | string[] }>
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
    : selection.campaigns

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: {
          label: selection.world.name,
          href: threadwatcherMode
            ? '/world?mode=threadwatcher'
            : `/world/${worldId}${weaverMode ? '?mode=weaver' : ''}`,
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
                <Link className={styles.secondary} href="/world?mode=threadwatcher">
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
              const manageableCampaign =
                campaign.isOwner ||
                campaign.role === 'GM' ||
                campaign.role === 'ASSISTANT_GM'
              const trackAsWeaver = weaverMode && manageableCampaign
              const modeQuery = trackAsWeaver
                ? '?mode=weaver'
                : threadwatcherMode
                  ? '?mode=threadwatcher'
                  : ''

              return (
                <TrackedEntryLink
                  key={campaign.id}
                  className={styles.card}
                  href={`/world/${worldId}/campaign/${campaign.id}${modeQuery}`}
                  tracking={
                    trackAsWeaver
                      ? {
                          kind: 'WEAVER',
                          worldId,
                          campaignId: campaign.id,
                        }
                      : undefined
                  }
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
