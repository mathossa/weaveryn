import { describe, expect, it } from 'vitest'
import { isOrphanedWorldLifecycleAction } from './orphaned-world-lifecycle'

describe('orphaned World lifecycle visual scenario action validation', () => {
  it('accepts only fixed lifecycle actions and fixture actors', () => {
    expect(isOrphanedWorldLifecycleAction({ action: 'relinquish' })).toBe(true)
    expect(
      isOrphanedWorldLifecycleAction({ action: 'claim', actor: 'ADMIN' }),
    ).toBe(true)
    expect(isOrphanedWorldLifecycleAction({ action: 'cleanup' })).toBe(true)
  })

  it('rejects arbitrary actors, record IDs, and extra fields', () => {
    expect(
      isOrphanedWorldLifecycleAction({ action: 'claim', actor: 'OWNER' }),
    ).toBe(false)
    expect(
      isOrphanedWorldLifecycleAction({
        action: 'claim',
        actor: 'ADMIN',
        worldId: 'arbitrary-world',
      }),
    ).toBe(false)
  })
})
