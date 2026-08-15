import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { WorldEntitiesLab } from './scenario-lab'

export const metadata: Metadata = {
  title: 'World entities scenario | Weaveryn',
}

export default function WorldEntitiesPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <WorldEntitiesLab />
}
