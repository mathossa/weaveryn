import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CampaignCharactersLab } from './scenario-lab'

export const metadata: Metadata = {
  title: 'CampaignCharacter scenario | Weaveryn',
}

export default function CampaignCharactersPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <CampaignCharactersLab />
}
