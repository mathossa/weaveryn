import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authenticatedUserNotFound, unauthenticated } from './auth-errors'

export interface AuthenticatedUser {
  id: string
  email: string
  username: string
  displayName: string | null
}

export interface AuthenticatedUserDependencies {
  getSession(headers: Headers): Promise<{ user: { id: string } } | null>
  findUser(userId: string): Promise<AuthenticatedUser | null>
}

const defaultDependencies: AuthenticatedUserDependencies = {
  async getSession(headers) {
    return auth.api.getSession({ headers })
  },
  async findUser(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
      },
    })
  },
}

export async function getAuthenticatedUser(
  headers: Headers,
  dependencies: AuthenticatedUserDependencies = defaultDependencies,
): Promise<AuthenticatedUser | null> {
  const session = await dependencies.getSession(headers)
  if (!session?.user.id) return null

  const user = await dependencies.findUser(session.user.id)
  if (!user) throw authenticatedUserNotFound(session.user.id)
  return user
}

export async function requireAuthenticatedUser(
  headers: Headers,
  dependencies: AuthenticatedUserDependencies = defaultDependencies,
) {
  const user = await getAuthenticatedUser(headers, dependencies)
  if (!user) throw unauthenticated()
  return user
}
