import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { requireAuthenticatedUser } from '@/server/auth'
import { getCampaignOverview } from '@/server/campaigns'
import styles from '../../../campaign.module.css'

const featureLabels = {
  notes: 'Notes',
  event: 'Events',
  dice: 'Dice roller',
  map: 'Campaign maps',
  npcs: 'NPCs',
  items: 'Items',
  timeline: 'Campaign timeline',
  objectives: 'Objectives',
  activity: 'Recent activity',
} as const

type FeatureKey = keyof typeof featureLabels

interface CampaignPlaceholderPageProps {
  params: Promise<{
    worldId: string
    campaignId: string
    feature: string
  }>
}

export default async function CampaignPlaceholderPage({
  params,
}: CampaignPlaceholderPageProps) {
  const [{ worldId, campaignId, feature }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(new Headers(await headers())),
  ])
  if (!(feature in featureLabels)) notFound()

  const campaign = await getCampaignOverview(worldId, campaignId, user.id)
  if (!campaign) notFound()

  const label = featureLabels[feature as FeatureKey]

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: { label: campaign.world.name, href: `/world/${worldId}` },
        campaign: {
          label: campaign.name,
          href: `/world/${worldId}/campaign/${campaign.id}`,
        },
      }}
    >
      <AppPage
        eyebrow="Campaign feature"
        title={`${label} — not implemented yet`}
        description="This dashboard entry is reserved for a later Weaveryn release. The Campaign dashboard already keeps the place for it so the layout does not need to be redesigned when the real feature arrives."
        actions={
          <Link
            className={styles.secondary}
            href={`/world/${worldId}/campaign/${campaign.id}`}
          >
            Back to Campaign
          </Link>
        }
      >
        <section className={styles.panel}>
          <h2>{label}</h2>
          <p>
            No temporary data model has been created for this placeholder. The
            future implementation will connect here through its authoritative
            Campaign, World, timeline, ruleset, map, or notes service.
          </p>
        </section>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
