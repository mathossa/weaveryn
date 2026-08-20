import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CampaignFoundationLab } from './campaign-foundation-lab'

export const metadata: Metadata = {
  title: 'Campaign Foundation Scenario | Weaveryn',
  description:
    'Development-only Campaign persistence and authorization scenario for issues #15 and #53.',
}

export default function CampaignFoundationPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <CampaignFoundationLab />
}
