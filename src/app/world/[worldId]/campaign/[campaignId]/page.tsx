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
  searchParams: Promise<{ character?: string | string[] }>
}

export default async function CampaignOverviewPage({
  params,
  searchParams,
}: CampaignOverviewPageProps) {
  const [{ worldId, campaignId }, query, user] = await Promise.all([
    params,
    searchParams,
    requireAuthenticatedUser(new Headers(await headers())),
  ])
  const campaign = await getCampaignOverview(worldId, campaignId, user.id)
  if (!campaign) notFound()
  const ownerLabel = campaign.owner.displayName ?? `@${campaign.owner.username}`
  const selectedWorldCharacterId =
    typeof query.character === 'string' ? query.character : undefined
  const selectedCharacter = selectedWorldCharacterId
    ? campaign.characters.find(
        (character) =>
          character.worldCharacterId === selectedWorldCharacterId &&
          character.ownedByCurrentUser,
      )
    : undefined
  const canChooseCharacter =
    campaign.status === 'ACTIVE' && campaign.role !== 'SPECTATOR'

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: { label: campaign.world.name, href: `/world/${worldId}` },
        campaign: {
          label: campaign.name,
          href: `/world/${worldId}/campaign/${campaign.id}`,
        },
        ...(selectedCharacter
          ? {
              character: {
                label: selectedCharacter.name,
                href: `/character/${selectedCharacter.worldCharacterId}?campaign=${campaign.id}`,
              },
            }
          : {}),
      }}
    >
      <AppPage
        eyebrow={campaign.isOwner ? 'Campaign owner · GM' : campaign.role}
        title={campaign.name}
        description={
          campaign.description || 'No Campaign description has been added yet.'
        }
        wide
        actions={
          <Link
            className={styles.secondary}
            href={`/world/${worldId}/campaign`}
          >
            Change Campaign
          </Link>
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
              {selectedCharacter ? (
                <p>
                  <strong>Entered as:</strong> {selectedCharacter.name}
                </p>
              ) : null}
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
                World calendar wizard tracked in #69.
              </p>
            </section>
          </div>

          <section className={styles.panel}>
            <h2>Party / Campaign Characters</h2>
            {campaign.characters.length === 0 ? (
              <p>No active Campaign Characters are attached yet.</p>
            ) : (
              <div className={styles.party}>
                {campaign.characters.map((character) =>
                  character.ownedByCurrentUser ? (
                    <Link
                      className={styles.partyItem}
                      href={`/character/${character.worldCharacterId}?campaign=${campaign.id}`}
                      key={character.id}
                    >
                      <strong>{character.name}</strong> · your Character
                    </Link>
                  ) : (
                    <div className={styles.partyItem} key={character.id}>
                      <strong>{character.name}</strong>
                    </div>
                  ),
                )}
              </div>
            )}
            {canChooseCharacter ? (
              <div className={styles.formActions}>
                <Link
                  className={styles.secondary}
                  href={`/character?world=${worldId}&campaign=${campaign.id}`}
                >
                  Choose or add your Character
                </Link>
              </div>
            ) : null}
          </section>

          {campaign.canEditSharedInfo ? (
            <section className={styles.panel}>
              <h2>Manage Campaign</h2>
              {!campaign.canEditName ? (
                <div className={styles.notice}>
                  As {campaign.role}, you can update the Campaign description
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

          {campaign.canManageMembers ? (
            <section className={styles.panel}>
              <h2>Campaign membership</h2>
              <p>
                You own this Campaign and control its membership. The production
                invite/member-management flow will connect here when that UI is
                implemented.
              </p>
            </section>
          ) : null}
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
