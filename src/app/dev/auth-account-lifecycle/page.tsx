import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AuthAccountLifecycleLab } from './scenario-lab'

export const metadata: Metadata = {
  title: 'Authentication and account lifecycle scenario | Weaveryn',
}

export default function AuthAccountLifecyclePage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <AuthAccountLifecycleLab />
}
