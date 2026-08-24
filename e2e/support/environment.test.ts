import { describe, expect, it, vi } from 'vitest'
import {
  assertE2EEnvironment,
  createE2EFixture,
  withGuaranteedCleanup,
} from './environment'

describe('E2E environment safety', () => {
  it('requires an explicit clearly marked PostgreSQL test database', () => {
    expect(() => assertE2EEnvironment({ E2E_RUN_ID: 'abcd1234' })).toThrow(
      'never falls back',
    )
    expect(() =>
      assertE2EEnvironment({
        E2E_DATABASE_URL:
          'postgresql://weaveryn:unused@127.0.0.1:5432/weaveryn_dev',
        E2E_RUN_ID: 'abcd1234',
      }),
    ).toThrow('clearly marked test database')
  })

  it('requires an explicit opt-in for a remote disposable database', () => {
    expect(() =>
      assertE2EEnvironment({
        E2E_DATABASE_URL:
          'postgresql://weaveryn:unused@db.example.invalid:5432/weaveryn_test',
        E2E_RUN_ID: 'abcd1234',
      }),
    ).toThrow('E2E_ALLOW_REMOTE_DATABASE=true')
  })

  it('creates deterministic run-owned identities and markers', () => {
    const environment = assertE2EEnvironment({
      E2E_DATABASE_URL:
        'postgresql://weaveryn:unused@127.0.0.1:5432/weaveryn_test',
      E2E_RUN_ID: 'abcd1234',
    })
    const fixture = createE2EFixture(environment)

    expect(fixture.marker).toBe('[e2e:abcd1234]')
    expect(fixture.users.owner.email).toContain('.abcd1234.')
    expect(fixture.users.worldMember.email).toContain('.worldmember@')
    expect(fixture.users.worldMember.username).not.toMatch(/[A-Z]/)
    expect(fixture.primaryWorld.description.startsWith(fixture.marker)).toBe(
      true,
    )
    expect(fixture.relationship.label.startsWith(fixture.marker)).toBe(true)
  })

  it('runs cleanup after a failing operation', async () => {
    const cleanup = vi.fn(async () => undefined)

    await expect(
      withGuaranteedCleanup(async () => {
        throw new Error('intentional test failure')
      }, cleanup),
    ).rejects.toThrow('intentional test failure')
    expect(cleanup).toHaveBeenCalledOnce()
  })
})
