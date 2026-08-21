import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { WorldEventsLab } from './scenario-lab'

export const metadata: Metadata = {
  title: 'World events scenario | Weaveryn',
}

export default function WorldEventsPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <WorldEventsLab />
}
