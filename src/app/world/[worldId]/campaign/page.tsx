import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { requireAuthenticatedUser } from '@/server/auth'
import { getWorldCampaignSelection } from '@/server/campaigns'
import styles from './campaign.module.css'

interface CampaignSelectionPageProps {
  params: Promise<{ worldId: string }>
}

export default async function CampaignSelectionPage({
  params,
}: CampaignSelectionPageProps) {
  const [{ worldId }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(new Headers(await headers())),
  ])
  const selection = await getWorldCampaignSelection(worldId, user.id)
  if (!selection) notFound()

  return (
    <AuthenticatedAppShell
      user={user}
      context={{ world: { label: selection.world.name, href: `/world/${worldId}` } }}
    >
      <AppPage
        eyebrow="Campaigns"
        title={`Campaigns in ${selection.world.name}`}
        description="Choose a Campaign you can access in this World."
        wide
        actions={
          selection.canCreateCampaign ? (
            <Link className={styles.secondary} href={`/world/${worldId}/campaign/create`}>
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
                <Link className={styles.secondary} href={`/world/${worldId}/campaign/create`}>
                  Create Campaign
                </Link>
              ) : undefined
            }
          >
            <p>You do not currently have access to a Campaign in this World.</p>
          </StatusPanel>
        ) : (
          <div className={styles.grid}>
            {selection.campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                className={styles.card}
                href={`/world/${worldId}/campaign/${campaign.id}`}
              >
                <span className={styles.badge}>{campaign.role}</span>
                <strong>{campaign.name}</strong>
                <span className={styles.meta}>
                  {campaign.isOwner ? 'Owner · ' : ''}{campaign.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
