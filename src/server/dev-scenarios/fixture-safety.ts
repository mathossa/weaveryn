export interface FixtureUserIdentity {
  id: string
  email: string
  username: string
}

export interface StoredFixtureUserIdentity {
  id: string
  email: string
  username: string | null
}

export class FixtureOwnershipError extends Error {
  readonly code = 'FIXTURE_OWNERSHIP_VIOLATION'

  constructor(message: string) {
    super(message)
    this.name = 'FixtureOwnershipError'
  }
}

export function assertFixtureWorldOwned(
  stored: { id: string; description: string | null } | null,
  expected: { id: string; marker: string },
) {
  if (
    stored &&
    (stored.id !== expected.id || stored.description !== expected.marker)
  ) {
    throw new FixtureOwnershipError(
      `Scenario fixture World ${expected.id} exists without the expected ownership marker.`,
    )
  }
}

export function assertFixtureUsersOwned(
  storedUsers: StoredFixtureUserIdentity[],
  expectedUsers: FixtureUserIdentity[],
) {
  for (const stored of storedUsers) {
    const expected = expectedUsers.find(
      (candidate) =>
        candidate.id === stored.id ||
        candidate.email === stored.email ||
        candidate.username === stored.username,
    )

    if (
      !expected ||
      expected.id !== stored.id ||
      expected.email !== stored.email ||
      expected.username !== stored.username
    ) {
      throw new FixtureOwnershipError(
        `Scenario fixture user identity ${stored.id} conflicts with existing development data.`,
      )
    }
  }
}
