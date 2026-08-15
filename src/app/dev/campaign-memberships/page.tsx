import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CampaignMembershipsLab } from './campaign-memberships-lab'

export const metadata: Metadata = {
  title: 'Campaign Memberships Scenario | Weaveryn',
  description: 'Development-only Campaign membership scenario for issue #16.',
}

export default function CampaignMembershipsPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <CampaignMembershipsLab />
}
