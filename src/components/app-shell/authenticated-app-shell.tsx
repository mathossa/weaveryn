import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getAuthenticatedUser, type AuthenticatedUser } from '@/server/auth'
import { AppShell } from './app-shell'
import type { AppShellContext, AppShellVariant } from './app-shell'
import { InAppNavigation } from './in-app-navigation'

export interface AuthenticatedAppShellProps {
  children: ReactNode
  context?: AppShellContext
  user?: AuthenticatedUser
  variant?: AppShellVariant
}

export async function AuthenticatedAppShell({
  children,
  context,
  user: suppliedUser,
  variant,
}: AuthenticatedAppShellProps) {
  const user =
    suppliedUser ?? (await getAuthenticatedUser(new Headers(await headers())))
  if (!user) redirect('/login')

  return (
    <AppShell
      user={{
        displayName: user.displayName,
        username: user.username,
        email: user.email,
      }}
      context={context}
      variant={variant}
    >
      {variant !== 'launcher' ? <InAppNavigation context={context} /> : null}
      {children}
    </AppShell>
  )
}
