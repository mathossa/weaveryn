import { describe, expect, it } from 'vitest'
import {
  assertFixtureUsersOwned,
  assertFixtureWorldOwned,
  FixtureOwnershipError,
} from './fixture-safety'

const expectedUsers = [
  {
    id: '34000000-0000-4000-8000-00000000000a',
    email: 'fixture-a@weaveryn.local',
    username: 'fixture-a',
  },
]

describe('development fixture isolation', () => {
  it('accepts exact scenario-owned identities', () => {
    expect(() =>
      assertFixtureUsersOwned(
        [
          {
            id: expectedUsers[0].id,
            email: expectedUsers[0].email,
            username: expectedUsers[0].username,
          },
        ],
        expectedUsers,
      ),
    ).not.toThrow()
  })

  it('rejects a unique-field collision instead of adopting unrelated data', () => {
    expect(() =>
      assertFixtureUsersOwned(
        [
          {
            id: '99000000-0000-4000-8000-000000000001',
            email: expectedUsers[0].email,
            username: 'real-development-user',
          },
        ],
        expectedUsers,
      ),
    ).toThrow(FixtureOwnershipError)
  })

  it('rejects a fixed World ID without the scenario ownership marker', () => {
    expect(() =>
      assertFixtureWorldOwned(
        {
          id: '34000000-0000-4000-8000-000000000001',
          description: 'unrelated development World',
        },
        {
          id: '34000000-0000-4000-8000-000000000001',
          marker: 'dev:scenario:v1',
        },
      ),
    ).toThrow(FixtureOwnershipError)
  })
})
