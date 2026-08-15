import { describe, expect, it } from 'vitest'
import { devScenarioCatalog, getDevScenarioMetadata } from './scenario-catalog'

describe('development scenario catalog', () => {
  it('keeps scenario IDs, routes, and fixture namespaces unique', () => {
    expect(new Set(devScenarioCatalog.map((scenario) => scenario.id)).size).toBe(
      devScenarioCatalog.length
    )
    expect(new Set(devScenarioCatalog.map((scenario) => scenario.href)).size).toBe(
      devScenarioCatalog.length
    )
    expect(
      new Set(devScenarioCatalog.map((scenario) => scenario.fixtureNamespace)).size
    ).toBe(devScenarioCatalog.length)
  })

  it('keeps issue #12 as the first registered scenario', () => {
    expect(devScenarioCatalog[0]).toMatchObject({
      id: 'world-ownership-transfer',
      issueNumbers: [12, 34],
      availability: 'available',
    })
    expect(getDevScenarioMetadata('world-update-example')).toBeDefined()
  })
})
