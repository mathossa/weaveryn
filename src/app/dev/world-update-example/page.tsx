import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { WorldUpdateExampleLab } from './world-update-example-lab'

export const metadata: Metadata = {
  title: 'World Update Contract Example | Weaveryn',
  description: 'Development-only shared scenario contract example for issue #34.',
}

export default function WorldUpdateExamplePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <WorldUpdateExampleLab />
}
