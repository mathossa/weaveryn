import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/server/auth'
import {
  getEntrySelection,
  getWeaverResume,
  listEntryPreferences,
} from '@/server/selection'

export async function loadSelectionPageData() {
  const user = await getAuthenticatedUser(new Headers(await headers()))
  if (!user) redirect('/login')

  const [selection, entryPreferences, weaverResume] = await Promise.all([
    getEntrySelection(user.id),
    listEntryPreferences(user.id),
    getWeaverResume(user.id),
  ])
  return { user, selection, entryPreferences, weaverResume }
}
