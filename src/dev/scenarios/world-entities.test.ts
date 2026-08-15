import { describe, expect, it } from 'vitest'
import { isWorldEntitiesScenarioAction } from './world-entities'

describe('World entities visual scenario action validation', () => {
  it('accepts only registered fixed actions', () => {
    expect(isWorldEntitiesScenarioAction({ action: 'create-entities' })).toBe(
      true,
    )
    expect(isWorldEntitiesScenarioAction({ action: 'cross-world-link' })).toBe(
      true,
    )
  })

  it('rejects arbitrary targets and extra request fields', () => {
    expect(isWorldEntitiesScenarioAction({ action: 'delete-world' })).toBe(
      false,
    )
    expect(
      isWorldEntitiesScenarioAction({
        action: 'update-entity',
        entityId: 'arbitrary',
      }),
    ).toBe(false)
  })
})
