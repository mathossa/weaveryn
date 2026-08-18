import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ChooseEntityEntryLab } from './choose-entity-entry-lab'

export const metadata: Metadata = {
  title: 'Choose Entity Entry Preferences | Weaveryn',
  description:
    'Development-only scenario for issue #51 entry pinning, recency, and Weaver resume behavior.',
}

export default function ChooseEntityEntryPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <ChooseEntityEntryLab />
}
