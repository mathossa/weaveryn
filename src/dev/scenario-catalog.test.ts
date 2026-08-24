import { describe, expect, it } from 'vitest'
import {
  devScenarioCatalog,
  getDevScenarioMetadata,
  requireDevScenarioMetadata,
} from './scenario-catalog'

describe('development scenario catalog', () => {
  it('keeps scenario IDs, routes, and fixture namespaces unique', () => {
    expect(
      new Set(devScenarioCatalog.map((scenario) => scenario.id)).size,
    ).toBe(devScenarioCatalog.length)
    expect(
      new Set(devScenarioCatalog.map((scenario) => scenario.href)).size,
    ).toBe(devScenarioCatalog.length)
    expect(
      new Set(devScenarioCatalog.map((scenario) => scenario.fixtureNamespace))
        .size,
    ).toBe(devScenarioCatalog.length)
  })

  it('exposes the required metadata for each implemented scenario', () => {
    expect(
      requireDevScenarioMetadata('world-ownership-transfer'),
    ).toMatchObject({
      id: 'world-ownership-transfer',
      issueNumbers: [12, 34],
      availability: 'available',
    })
    expect(requireDevScenarioMetadata('campaign-foundation')).toMatchObject({
      issueNumbers: [15, 53, 138],
      availability: 'available',
    })
    expect(getDevScenarioMetadata('world-update-example')).toBeDefined()
  })
})
