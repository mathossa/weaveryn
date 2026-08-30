import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/server/auth'
import { JoinInviteForm } from './join-invite-form'

interface JoinInvitePageProps {
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function JoinInviteHandoffPage({
  searchParams,
}: JoinInvitePageProps) {
  const [user, params] = await Promise.all([
    getAuthenticatedUser(new Headers(await headers())),
    searchParams,
  ])

  if (!user) redirect('/login')

  const token = Array.isArray(params.token) ? params.token[0] : params.token

  return <JoinInviteForm initialToken={token ?? null} />
}
