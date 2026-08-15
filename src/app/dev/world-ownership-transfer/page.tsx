import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OwnershipTransferLab } from './ownership-transfer-lab'

export const metadata: Metadata = {
  title: 'Ownership Transfer Lab | Weaveryn',
  description: 'Development-only visual acceptance test for issue #12.',
}

export default function WorldOwnershipTransferLabPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <OwnershipTransferLab />
}
