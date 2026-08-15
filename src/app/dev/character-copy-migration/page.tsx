import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CharacterCopyMigrationLab } from './scenario-lab'

export const metadata: Metadata = {
  title: 'Character copy and migration scenario | Weaveryn',
}

export default function CharacterCopyMigrationPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <CharacterCopyMigrationLab />
}
