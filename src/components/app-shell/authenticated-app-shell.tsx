import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getAuthenticatedUser } from '@/server/auth'
import { AppShell } from './app-shell'
import type { AppShellContext } from './app-shell'

export interface AuthenticatedAppShellProps {
  children: ReactNode
  context?: AppShellContext
}

export async function AuthenticatedAppShell({
  children,
  context,
}: AuthenticatedAppShellProps) {
  const user = await getAuthenticatedUser(new Headers(await headers()))
  if (!user) redirect('/login')

  return (
    <AppShell
      user={{
        displayName: user.displayName,
        username: user.username,
        email: user.email,
      }}
      context={context}
    >
      {children}
    </AppShell>
  )
}
