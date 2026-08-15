import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CharacterWorldCharacterFoundationLab } from './scenario-lab'

export const metadata: Metadata = {
  title: 'Character foundation scenario | Weaveryn',
}
export default function CharacterWorldCharacterFoundationPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <CharacterWorldCharacterFoundationLab />
}
