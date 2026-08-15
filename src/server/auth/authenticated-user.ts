import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export class AuthenticationRequiredError extends Error {
  readonly code = 'AUTHENTICATION_REQUIRED'

  constructor() {
    super('Authentication is required for this operation.')
    this.name = 'AuthenticationRequiredError'
  }
}

export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser()
  if (!user) throw new AuthenticationRequiredError()
  return user
}
