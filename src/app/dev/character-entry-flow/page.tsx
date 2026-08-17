import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CharacterEntryFlowLab } from './scenario-lab'

export const metadata: Metadata = {
  title: 'Character entry flow scenario | Weaveryn',
}

export default function CharacterEntryFlowPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <CharacterEntryFlowLab />
}
