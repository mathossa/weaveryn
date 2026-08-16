import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { requireAuthenticatedUser } from '@/server/auth'
import { getCampaignOverview } from '@/server/campaigns'
import { CampaignForm } from '../_components/campaign-form'
import styles from '../campaign.module.css'

interface CampaignOverviewPageProps {
  params: Promise<{ worldId: string; campaignId: string }>
}

export default async function CampaignOverviewPage({
  params,
}: CampaignOverviewPageProps) {
  const [{ worldId, campaignId }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(new Headers(await headers())),
  ])
  const campaign = await getCampaignOverview(worldId, campaignId, user.id)
  if (!campaign) notFound()

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: { label: campaign.world.name, href: `/world/${worldId}` },
        campaign: { label: campaign.name, href: `/world/${worldId}/campaign/${campaign.id}` },
      }}
    >
      <AppPage
        eyebrow={campaign.isOwner ? 'Campaign owner · GM' : campaign.role}
        title={campaign.name}
        description={campaign.description || 'No Campaign description has been added yet.'}
        wide
        actions={
          <Link className={styles.secondary} href={`/world/${worldId}/campaign`}>
            Change Campaign
          </Link>
        }
      >
        <div className={styles.stack}>
          <div className={styles.infoGrid}>
            <section className={styles.panel}>
              <h2>Campaign context</h2>
              <p><strong>World:</strong> {campaign.world.name}</p>
              <p><strong>Ownership:</strong> {campaign.isOwner ? 'You own this Campaign' : 'Owned by another user'}</p>
              <p><strong>Your role:</strong> {campaign.role}</p>
              <p><strong>Status:</strong> {campaign.status}</p>
            </section>

            <section className={styles.panel}>
              <h2>World time</h2>
              <p><strong>Label:</strong> {campaign.currentWorldDateLabel ?? 'Not set'}</p>
              <p><strong>Position:</strong> {campaign.currentWorldPosition ?? 'Not set'}</p>
              <p className={styles.meta}>World calendar wizard tracked in #69.</p>
            </section>
          </div>

          <section className={styles.panel}>
            <h2>Party / Campaign Characters</h2>
            {campaign.characters.length === 0 ? (
              <p>No active Campaign Characters are attached yet.</p>
            ) : (
              <div className={styles.party}>
                {campaign.characters.map((character) => (
                  <div className={styles.partyItem} key={character.id}>
                    <strong>{character.name}</strong>
                  </div>
                ))}
              </div>
            )}
            <p className={styles.meta}>Character entry and management connects fully in #54.</p>
          </section>

          {campaign.canEditSharedInfo ? (
            <section className={styles.panel}>
              <h2>Manage Campaign</h2>
              {!campaign.canEditName ? (
                <div className={styles.notice}>
                  As {campaign.role}, you can update the Campaign description and World time. Renaming and ownership/lifecycle management remain owner-only.
                </div>
              ) : null}
              <CampaignForm
                mode="edit"
                worldId={worldId}
                campaignId={campaign.id}
                canEditName={campaign.canEditName}
                initialName={campaign.name}
                initialDescription={campaign.description}
                initialWorldPosition={campaign.currentWorldPosition}
                initialWorldDateLabel={campaign.currentWorldDateLabel}
              />
            </section>
          ) : null}
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
