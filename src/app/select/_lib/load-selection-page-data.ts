import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/server/auth'
import { getEntrySelection } from '@/server/selection'

export async function loadSelectionPageData() {
  const user = await getAuthenticatedUser(new Headers(await headers()))
  if (!user) redirect('/login')

  const selection = await getEntrySelection(user.id)
  return { user, selection }
}
