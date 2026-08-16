import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/ui/auth-shell'
import { getAuthenticatedUser } from '@/server/auth'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function LoginPage() {
  const user = await getAuthenticatedUser(new Headers(await headers()))
  if (user) redirect('/select')

  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  )
}
