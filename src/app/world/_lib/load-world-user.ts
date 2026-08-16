import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/server/auth'

export async function loadWorldPageUser() {
  const user = await getAuthenticatedUser(new Headers(await headers()))
  if (!user) redirect('/login')
  return user
}
