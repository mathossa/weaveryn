import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CampaignFoundationLab } from './campaign-foundation-lab'

export const metadata: Metadata = {
  title: 'Campaign Foundation Scenario | Weaveryn',
  description:
    'Development-only Campaign persistence, ownership, lifecycle, and authorization scenario.',
}

export default function CampaignFoundationPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <CampaignFoundationLab />
}
