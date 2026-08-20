import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { MembershipInviteManager } from '@/components/invitations/membership-invite-manager'
import { MembershipManager } from '@/components/memberships/membership-manager'
import { RoleHelp } from '@/components/memberships/role-help'
import { campaignRoleLabel } from '@/lib/role-labels'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  CAMPAIGN_ROLES,
  getCampaignOverview,
  listCampaignMembershipsForManagement,
} from '@/server/campaigns'
import { membershipInvitationService } from '@/server/invitations'
import { listEntryPreferences } from '@/server/selection'
import { RemoveCampaignCharacterButton } from '../_components/remove-campaign-character-button'
import { CampaignForm } from '../../_components/campaign-form'
import styles from '../../campaign.module.css'

interface CampaignManagePageProps {
  params: Promise<{ worldId: string; campaignId: string }>
  searchParams: Promise<{
    character?: string | string[]
    mode?: string | string[]
  }>
}

function characterFromCampaignReferer(
  referer: string | null,
  worldId: string,
  campaignId: string,
) {
  if (!referer) return undefined

  try {
    const url = new URL(referer)
    if (url.pathname !== `/world/${worldId}/campaign/${campaignId}`) {
      return undefined
    }

    return url.searchParams.get('character') ?? undefined
  } catch {
    return undefined
  }
}

export default async function CampaignManagePage({
  params,
  searchParams,
}: CampaignManagePageProps) {
  const [{ worldId, campaignId }, query, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers(),
  ])
  const user = await requireAuthenticatedUser(new Headers(requestHeaders))
  const [campaign, entryPreferences] = await Promise.all([
    getCampaignOverview(worldId, campaignId, user.id),
    listEntryPreferences(user.id),
  ])
  if (!campaign) notFound()

  const canManageCampaign =
    campaign.canEditSharedInfo ||
    campaign.canEditName ||
    campaign.canManageMembers
  if (!canManageCampaign) notFound()

  const [campaignInvitations, campaignMembers] = campaign.canManageMembers
    ? await Promise.all([
        membershipInvitationService.listCampaignInvitations({
          actorUserId: user.id,
          campaignId: campaign.id,
        }),
        listCampaignMembershipsForManagement(campaign.id, user.id),
      ])
    : [[], null]

  const explicitWeaverMode = query.mode === 'weaver'
  const requestedCharacterId =
    typeof query.character === 'string' ? query.character : undefined
  const referredCharacterId = explicitWeaverMode
    ? undefined
    : characterFromCampaignReferer(
        requestHeaders.get('referer'),
        worldId,
        campaignId,
      )
  const latestCampaignPreference =
    requestedCharacterId || referredCharacterId || explicitWeaverMode
      ? undefined
      : entryPreferences
          .filter(
            (preference) =>
              preference.campaignId === campaign.id && preference.lastUsedAt,
          )
          .sort(
            (left, right) =>
              (right.lastUsedAt?.getTime() ?? 0) -
              (left.lastUsedAt?.getTime() ?? 0),
          )[0]
  const preferredCharacterId = explicitWeaverMode
    ? undefined
    : (requestedCharacterId ??
      referredCharacterId ??
      (latestCampaignPreference?.kind === 'CHARACTER'
        ? (latestCampaignPreference.worldCharacterId ?? undefined)
        : undefined))
  const selectedCharacter = preferredCharacterId
    ? campaign.characters.find(
        (character) =>
          character.worldCharacterId === preferredCharacterId &&
          character.ownedByCurrentUser,
      )
    : undefined
  const campaignHref = explicitWeaverMode
    ? `/world/${worldId}/campaign/${campaign.id}?mode=weaver`
    : selectedCharacter
      ? `/world/${worldId}/campaign/${campaign.id}?character=${selectedCharacter.worldCharacterId}`
      : `/world/${worldId}/campaign/${campaign.id}`

  const ownerLabel = campaign.owner.displayName ?? `@${campaign.owner.username}`
  const roleLabel = campaignRoleLabel(campaign.role)

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: { label: campaign.world.name, href: `/world/${worldId}` },
        campaign: {
          label: campaign.name,
          href: campaignHref,
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
        eyebrow="Campaign management"
        title={`Manage ${campaign.name}`}
        description="Configure the Campaign without turning the Campaign landing page into an administration screen."
        wide
        actions={
          <div className={styles.formActions}>
            <Link className={styles.secondary} href={campaignHref}>
              Back to Campaign
            </Link>
            <Link
              className={styles.secondary}
              href={`/world/${worldId}/campaign`}
            >
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
                <strong>Your role:</strong> {roleLabel}
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
                The World calendar/date-system wizard is tracked in #69.
              </p>
            </section>
          </div>

          {campaign.canEditSharedInfo ? (
            <section className={styles.panel}>
              <h2>General Campaign settings</h2>
              {!campaign.canEditName ? (
                <div className={styles.notice}>
                  As {roleLabel}, you can update shared Campaign information and
                  World time. Renaming and ownership/lifecycle management remain
                  owner-only.
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
            <p className={styles.meta}>
              Character participation is separate from Campaign membership.
              Removing participation keeps the portable Character and
              WorldCharacter intact.
            </p>
            {campaign.characters.length === 0 ? (
              <p>No active Campaign Characters are attached yet.</p>
            ) : (
              <div className={styles.party}>
                {campaign.characters.map((character) => (
                  <div className={styles.partyItem} key={character.id}>
                    <div>
                      <strong>{character.name}</strong>
                      <span className={styles.meta}>
                        {' · '}
                        {character.owner.displayName ??
                          `@${character.owner.username}`}
                        {character.ownedByCurrentUser
                          ? ' · your Character'
                          : ''}
                      </span>
                    </div>
                    <RemoveCampaignCharacterButton
                      campaignCharacterId={character.id}
                      characterName={character.name}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {campaign.canManageMembers ? (
            <section className={styles.panel}>
              <h2>Campaign membership</h2>
              <p className={styles.meta}>
                Promote, demote, or remove existing members, or create a
                single-use invitation. A Threadwatcher also receives read-only
                access to the host World, but only sees Campaigns they actually
                belong to.
              </p>
              <RoleHelp targetKind="Campaign" />
              <h3>Members</h3>
              <MembershipManager
                endpoint={`/api/v1/worlds/${worldId}/campaigns/${campaign.id}/members`}
                roles={CAMPAIGN_ROLES}
                targetKind="Campaign"
                initialMembers={campaignMembers ?? []}
              />
              <h3>Invite someone</h3>
              <MembershipInviteManager
                endpoint={`/api/v1/worlds/${worldId}/campaigns/${campaign.id}/invitations`}
                roles={CAMPAIGN_ROLES}
                targetKind="Campaign"
                initialInvitations={campaignInvitations.map((invitation) => ({
                  id: invitation.id,
                  role: invitation.role,
                  expiresAt: invitation.expiresAt.toISOString(),
                }))}
              />
            </section>
          ) : null}
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
