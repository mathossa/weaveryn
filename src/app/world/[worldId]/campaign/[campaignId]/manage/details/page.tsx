import { notFound } from 'next/navigation'
import { CampaignForm } from '../../../_components/campaign-form'
import styles from '../../../campaign.module.css'
import { CampaignManagementPage } from '../_components/campaign-management-page'
import {
  loadCampaignManagementPage,
  type CampaignManagementSearchParams,
} from '../_lib/campaign-management-page'

interface CampaignDetailsPageProps {
  params: Promise<{ worldId: string; campaignId: string }>
  searchParams: Promise<CampaignManagementSearchParams>
}

export default async function CampaignDetailsPage({
  params,
  searchParams,
}: CampaignDetailsPageProps) {
  const data = await loadCampaignManagementPage(params, searchParams)
  const { campaign } = data
  if (!campaign.canEditSharedInfo) notFound()

  return (
    <CampaignManagementPage
      data={data}
      title="Campaign details"
      description="Edit the name and description shown throughout the Campaign."
    >
      <section className={styles.focusedManagementPanel}>
        {!campaign.canEditName ? (
          <div className={styles.notice}>
            As {data.roleLabel}, you can edit the shared description. Renaming
            the Campaign remains owner-only.
          </div>
        ) : null}
        <CampaignForm
          mode="edit"
          section="details"
          worldId={data.worldId}
          campaignId={campaign.id}
          canEditName={campaign.canEditName}
          initialName={campaign.name}
          initialDescription={campaign.description}
        />
      </section>
    </CampaignManagementPage>
  )
}
