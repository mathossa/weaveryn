import { notFound } from 'next/navigation'
import { MembershipInviteManager } from '@/components/invitations/membership-invite-manager'
import { MembershipManager } from '@/components/memberships/membership-manager'
import { RoleHelp } from '@/components/memberships/role-help'
import {
  CAMPAIGN_ROLES,
  listCampaignMembershipsForManagement,
} from '@/server/campaigns'
import { membershipInvitationService } from '@/server/invitations'
import styles from '../../../campaign.module.css'
import { CampaignManagementPage } from '../_components/campaign-management-page'
import {
  loadCampaignManagementPage,
  type CampaignManagementSearchParams,
} from '../_lib/campaign-management-page'

interface CampaignMembersPageProps {
  params: Promise<{ worldId: string; campaignId: string }>
  searchParams: Promise<CampaignManagementSearchParams>
}

export default async function CampaignMembersPage({
  params,
  searchParams,
}: CampaignMembersPageProps) {
  const data = await loadCampaignManagementPage(params, searchParams)
  const { campaign } = data
  if (!campaign.canManageMembers) notFound()

  const [campaignInvitations, campaignMembers] = await Promise.all([
    membershipInvitationService.listCampaignInvitations({
      actorUserId: data.user.id,
      campaignId: campaign.id,
    }),
    listCampaignMembershipsForManagement(campaign.id, data.user.id),
  ])
  if (!campaignMembers) notFound()

  return (
    <CampaignManagementPage
      data={data}
      title="Members & roles"
      description="Manage Campaign access, roles, capabilities, and active invitation links."
      layout="wide"
    >
      <div className={styles.stack}>
        <section className={styles.panel}>
          <h2>Members</h2>
          <p className={styles.supportingCopy}>
            Campaign membership grants access and a functional role. Character
            participation is managed separately.
          </p>
          <RoleHelp targetKind="Campaign" />
          <MembershipManager
            endpoint={`/api/v1/worlds/${data.worldId}/campaigns/${campaign.id}/members`}
            roles={CAMPAIGN_ROLES}
            targetKind="Campaign"
            initialMembers={campaignMembers}
          />
        </section>

        <section className={styles.panel}>
          <h2>Invitations</h2>
          <p className={styles.supportingCopy}>
            Create single-use invitation links or revoke links that should no
            longer grant Campaign access.
          </p>
          <MembershipInviteManager
            endpoint={`/api/v1/worlds/${data.worldId}/campaigns/${campaign.id}/invitations`}
            roles={CAMPAIGN_ROLES}
            targetKind="Campaign"
            initialInvitations={campaignInvitations.map((invitation) => ({
              id: invitation.id,
              role: invitation.role,
              expiresAt: invitation.expiresAt.toISOString(),
            }))}
          />
        </section>
      </div>
    </CampaignManagementPage>
  )
}
