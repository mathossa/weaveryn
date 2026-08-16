import { describe, expect, it } from 'vitest'
import {
  getAuthenticatedUser,
  requireAuthenticatedUser,
  type AuthenticatedUserDependencies,
} from './authenticated-user'

const user = {
  id: '14000000-0000-4000-8000-000000000001',
  email: 'player@example.test',
  username: null,
  displayName: 'Player',
}

function dependencies(
  sessionUserId: string | null,
  storedUser: typeof user | null = user,
): AuthenticatedUserDependencies {
  return {
    async getSession() {
      return sessionUserId ? { user: { id: sessionUserId } } : null
    },
    async findUser() {
      return storedUser
    },
  }
}

describe('authenticated User resolution', () => {
  it('resolves the stable Weaveryn User id from the server session', async () => {
    const resolved = await getAuthenticatedUser(
      new Headers(),
      dependencies(user.id),
    )

    expect(resolved).toEqual(user)
  })

  it('returns null when no authenticated server session exists', async () => {
    await expect(
      getAuthenticatedUser(new Headers(), dependencies(null)),
    ).resolves.toBeNull()
  })

  it('rejects a missing domain User even when a stale session names an id', async () => {
    await expect(
      requireAuthenticatedUser(new Headers(), dependencies(user.id, null)),
    ).rejects.toMatchObject({ code: 'AUTHENTICATED_USER_NOT_FOUND' })
  })

  it('rejects unauthenticated callers instead of accepting an actor id', async () => {
    await expect(
      requireAuthenticatedUser(new Headers(), dependencies(null)),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })
})
