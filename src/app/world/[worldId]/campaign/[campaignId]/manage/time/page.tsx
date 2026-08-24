import { notFound } from 'next/navigation'
import { CampaignForm } from '../../../_components/campaign-form'
import styles from '../../../campaign.module.css'
import { CampaignManagementPage } from '../_components/campaign-management-page'
import {
  loadCampaignManagementPage,
  type CampaignManagementSearchParams,
} from '../_lib/campaign-management-page'

interface CampaignTimePageProps {
  params: Promise<{ worldId: string; campaignId: string }>
  searchParams: Promise<CampaignManagementSearchParams>
}

export default async function CampaignTimePage({
  params,
  searchParams,
}: CampaignTimePageProps) {
  const data = await loadCampaignManagementPage(params, searchParams)
  const { campaign } = data
  if (!campaign.canEditSharedInfo) notFound()

  return (
    <CampaignManagementPage
      data={data}
      title="World time"
      description="Set the World date shown to players and its sortable timeline position."
    >
      <section className={styles.focusedManagementPanel}>
        <div className={styles.managementCurrentValues}>
          <div>
            <span>Current date</span>
            <strong>
              {campaign.currentWorldDateLabel || 'World date not set'}
            </strong>
          </div>
          <div>
            <span>Timeline position</span>
            <strong>{campaign.currentWorldPosition || 'Not set'}</strong>
          </div>
        </div>
        <CampaignForm
          mode="edit"
          section="time"
          worldId={data.worldId}
          campaignId={campaign.id}
          canEditName={false}
          initialWorldPosition={campaign.currentWorldPosition}
          initialWorldDateLabel={campaign.currentWorldDateLabel}
        />
      </section>
    </CampaignManagementPage>
  )
}
