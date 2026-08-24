import { notFound } from 'next/navigation'
import { listCampaignMembershipsForManagement } from '@/server/campaigns'
import {
  CampaignDeleteControl,
  CampaignLifecycleControls,
  CampaignOwnershipTransferControl,
} from '../../_components/campaign-lifecycle-controls'
import styles from '../../../campaign.module.css'
import { CampaignManagementPage } from '../_components/campaign-management-page'
import {
  loadCampaignManagementPage,
  type CampaignManagementSearchParams,
} from '../_lib/campaign-management-page'

interface CampaignAdvancedPageProps {
  params: Promise<{ worldId: string; campaignId: string }>
  searchParams: Promise<CampaignManagementSearchParams>
}

export default async function CampaignAdvancedPage({
  params,
  searchParams,
}: CampaignAdvancedPageProps) {
  const data = await loadCampaignManagementPage(params, searchParams)
  const { campaign } = data
  if (!campaign.canDelete) notFound()

  const campaignMembers = campaign.canTransferOwnership
    ? await listCampaignMembershipsForManagement(campaign.id, data.user.id)
    : []

  return (
    <CampaignManagementPage
      data={data}
      title="Advanced"
      description="Review ownership and handle rare, high-impact Campaign actions."
      layout="wide"
    >
      <div className={styles.advancedManagementStack}>
        <section className={styles.panel}>
          <div className={styles.advancedSectionHeading}>
            <span>Ownership</span>
            <h2>Campaign owner</h2>
          </div>
          <p className={styles.supportingCopy}>
            Current owner: <strong>{data.ownerLabel}</strong>
          </p>
          <CampaignOwnershipTransferControl
            worldId={data.worldId}
            campaignId={campaign.id}
            campaignName={campaign.name}
            canTransferOwnership={campaign.canTransferOwnership}
            transferTargets={(campaignMembers ?? []).filter(
              (member) => member.userId !== campaign.owner.id,
            )}
          />
        </section>

        <section className={`${styles.panel} ${styles.highImpactPanel}`}>
          <div className={styles.advancedSectionHeading}>
            <span>Campaign lifecycle</span>
            <h2>{data.statusLabel}</h2>
          </div>
          <p className={styles.supportingCopy}>
            {campaign.status === 'ACTIVE'
              ? 'Ending stops active play while preserving the Campaign and its persisted information.'
              : campaign.status === 'ENDED'
                ? 'Archiving makes this Campaign historical and read-only.'
                : 'This Campaign is historical and read-only.'}
          </p>
          <CampaignLifecycleControls
            worldId={data.worldId}
            campaignId={campaign.id}
            campaignName={campaign.name}
            status={campaign.status}
            canEnd={campaign.canEnd}
            canArchive={campaign.canArchive}
          />
        </section>

        <section className={`${styles.panel} ${styles.dangerZone}`}>
          <div className={styles.advancedSectionHeading}>
            <span>Danger zone</span>
            <h2>Delete Campaign</h2>
          </div>
          <p className={styles.supportingCopy}>
            Permanently remove this Campaign and Campaign-scoped participation.
            Portable Characters, WorldCharacters, and the World are preserved.
          </p>
          <CampaignDeleteControl
            worldId={data.worldId}
            campaignId={campaign.id}
            campaignName={campaign.name}
          />
        </section>
      </div>
    </CampaignManagementPage>
  )
}
