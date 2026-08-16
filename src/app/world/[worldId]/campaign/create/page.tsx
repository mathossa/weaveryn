import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { requireAuthenticatedUser } from '@/server/auth'
import { getWorldCampaignSelection } from '@/server/campaigns'
import { CampaignForm } from '../_components/campaign-form'
import styles from '../campaign.module.css'

interface CreateCampaignPageProps {
  params: Promise<{ worldId: string }>
}

export default async function CreateCampaignPage({ params }: CreateCampaignPageProps) {
  const [{ worldId }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(new Headers(await headers())),
  ])
  const selection = await getWorldCampaignSelection(worldId, user.id)
  if (!selection || !selection.canCreateCampaign) notFound()

  return (
    <AuthenticatedAppShell
      user={user}
      context={{ world: { label: selection.world.name, href: `/world/${worldId}` } }}
    >
      <AppPage
        eyebrow="Campaigns"
        title="Create Campaign"
        description={`Create a Campaign in ${selection.world.name}. You will own it and receive the GM role.`}
        actions={
          <Link className={styles.secondary} href={`/world/${worldId}/campaign`}>
            Back to Campaigns
          </Link>
        }
      >
        <section className={styles.panel}>
          <CampaignForm mode="create" worldId={worldId} />
        </section>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
