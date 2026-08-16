import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getAuthenticatedUser } from '@/server/auth'
import { isAdminNetworkAllowed } from '@/server/admin/admin-network-policy'
import { AppShell } from './app-shell'

export interface InstanceAdminAppShellProps {
  children: ReactNode
}

export async function InstanceAdminAppShell({
  children,
}: InstanceAdminAppShellProps) {
  const requestHeaders = new Headers(await headers())

  if (!isAdminNetworkAllowed(requestHeaders)) notFound()

  const user = await getAuthenticatedUser(requestHeaders)
  if (!user) redirect('/login')
  if (!user.isInstanceAdmin) notFound()

  return (
    <AppShell
      user={{
        displayName: user.displayName,
        username: user.username,
        email: user.email,
      }}
    >
      {children}
    </AppShell>
  )
}
