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

  const selection = await getEntrySelection(user.id)
  const [entryPreferences, weaverResume] = await Promise.all([
    listEntryPreferences(user.id),
    getWeaverResume(user.id, selection.weaverWorlds),
  ])
  return { user, selection, entryPreferences, weaverResume }
}
