import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { requireAuthenticatedUser } from '@/server/auth'
import { getCampaignOverview } from '@/server/campaigns'
import { CampaignForm } from '../../_components/campaign-form'
import styles from '../../campaign.module.css'

interface CampaignManagePageProps {
  params: Promise<{ worldId: string; campaignId: string }>
}

export default async function CampaignManagePage({
  params,
}: CampaignManagePageProps) {
  const [{ worldId, campaignId }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(new Headers(await headers())),
  ])
  const campaign = await getCampaignOverview(worldId, campaignId, user.id)
  if (!campaign) notFound()

  const canManageCampaign =
    campaign.canEditSharedInfo || campaign.canEditName || campaign.canManageMembers
  if (!canManageCampaign) notFound()

  const ownerLabel = campaign.owner.displayName ?? `@${campaign.owner.username}`

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
        eyebrow="Campaign management"
        title={`Manage ${campaign.name}`}
        description="Configure the Campaign without turning the Campaign landing page into an administration screen."
        wide
        actions={
          <div className={styles.formActions}>
            <Link
              className={styles.secondary}
              href={`/world/${worldId}/campaign/${campaign.id}`}
            >
              Back to Campaign
            </Link>
            <Link className={styles.secondary} href={`/world/${worldId}/campaign`}>
              Change Campaign
            </Link>
          </div>
        }
      >
        <div className={styles.stack}>
          <div className={styles.infoGrid}>
            <section className={styles.panel}>
              <h2>Campaign context</h2>
              <p>
                <strong>World:</strong> {campaign.world.name}
              </p>
              <p>
                <strong>Owner:</strong> {ownerLabel}
                {campaign.isOwner ? ' (you)' : ''}
              </p>
              <p>
                <strong>Your role:</strong> {campaign.role}
              </p>
              <p>
                <strong>Status:</strong> {campaign.status}
              </p>
            </section>

            <section className={styles.panel}>
              <h2>World time</h2>
              <p>
                <strong>Label:</strong>{' '}
                {campaign.currentWorldDateLabel ?? 'Not set'}
              </p>
              <p>
                <strong>Position:</strong>{' '}
                {campaign.currentWorldPosition ?? 'Not set'}
              </p>
              <p className={styles.meta}>
                The World calendar/date-system wizard is tracked in #69.
              </p>
            </section>
          </div>

          {campaign.canEditSharedInfo ? (
            <section className={styles.panel}>
              <h2>General Campaign settings</h2>
              {!campaign.canEditName ? (
                <div className={styles.notice}>
                  As {campaign.role}, you can update shared Campaign information
                  and World time. Renaming and ownership/lifecycle management
                  remain owner-only.
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

          <section className={styles.panel}>
            <h2>Campaign Characters</h2>
            {campaign.characters.length === 0 ? (
              <p>No active Campaign Characters are attached yet.</p>
            ) : (
              <div className={styles.party}>
                {campaign.characters.map((character) => (
                  <div className={styles.partyItem} key={character.id}>
                    <strong>{character.name}</strong>
                    {character.ownedByCurrentUser ? ' · your Character' : ''}
                  </div>
                ))}
              </div>
            )}
          </section>

          {campaign.canManageMembers ? (
            <section className={styles.panel}>
              <h2>Campaign membership</h2>
              <p>
                Invitation and member management will connect here through #108.
              </p>
            </section>
          ) : null}
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
