import { describe, expect, it } from 'vitest'
import { devScenarioCatalog } from '../../dev/scenario-catalog'
import { listRegisteredDevScenarios } from './registry'

describe('development scenario registry', () => {
  it('registers every available catalog scenario exactly once', () => {
    const availableIds = devScenarioCatalog
      .filter((scenario) => scenario.availability === 'available')
      .map((scenario) => scenario.id)
      .sort()
    const registeredIds = listRegisteredDevScenarios()
      .map((scenario) => scenario.metadata.id)
      .sort()

    expect(registeredIds).toEqual(availableIds)
    expect(new Set(registeredIds).size).toBe(registeredIds.length)
  })
})
