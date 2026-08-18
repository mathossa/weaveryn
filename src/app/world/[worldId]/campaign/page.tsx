import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { StatusPanel } from '@/components/ui/status-panel'
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

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: {
          label: selection.world.name,
          href: `/world/${worldId}${weaverMode ? '?mode=weaver' : ''}`,
        },
      }}
    >
      <AppPage
        eyebrow="Campaigns"
        title={`Campaigns in ${selection.world.name}`}
        description="Choose a Campaign you can access in this World."
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
        {selection.campaigns.length === 0 ? (
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
            {selection.campaigns.map((campaign) => {
              const manageableCampaign =
                campaign.isOwner ||
                campaign.role === 'GM' ||
                campaign.role === 'ASSISTANT_GM'
              const trackAsWeaver = weaverMode && manageableCampaign

              return (
                <TrackedEntryLink
                  key={campaign.id}
                  className={styles.card}
                  href={`/world/${worldId}/campaign/${campaign.id}${trackAsWeaver ? '?mode=weaver' : ''}`}
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
                  <span className={styles.badge}>{campaign.role}</span>
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
