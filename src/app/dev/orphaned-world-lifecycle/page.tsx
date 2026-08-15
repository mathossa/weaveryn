import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OrphanedWorldLifecycleLab } from './scenario-lab'

export const metadata: Metadata = {
  title: 'Orphaned World Lifecycle Lab | Weaveryn',
  description: 'Development-only visual acceptance test for issue #13.',
}

export default function OrphanedWorldLifecyclePage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <OrphanedWorldLifecycleLab />
}
