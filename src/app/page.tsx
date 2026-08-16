import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/server/auth'

export default async function Home() {
  const user = await getAuthenticatedUser(new Headers(await headers()))
  redirect(user ? '/select' : '/login')
}
