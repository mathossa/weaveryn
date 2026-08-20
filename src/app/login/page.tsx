import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/ui/auth-shell'
import { normalizeInternalReturnPath } from '@/lib/internal-return-path'
import { getAuthenticatedUser } from '@/server/auth'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

interface LoginPageProps {
  searchParams: Promise<{ next?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [query, user] = await Promise.all([
    searchParams,
    getAuthenticatedUser(new Headers(await headers())),
  ])
  const returnTo = normalizeInternalReturnPath(query.next)
  if (user) redirect(returnTo)

  return (
    <AuthShell>
      <LoginForm returnTo={returnTo} />
    </AuthShell>
  )
}
