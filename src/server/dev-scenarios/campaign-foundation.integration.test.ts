import 'dotenv/config'

import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { assertSafeDevEnvironment } from './environment'
import { campaignFoundationScenario } from './campaign-foundation'

describe('Campaign foundation visual scenario', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await campaignFoundationScenario.cleanup()
  })

  it('passes ownership-transfer, lifecycle, archival, and identity-preservation checks through Run All', async () => {
    const result = await campaignFoundationScenario.runAll()

    expect(result.ok).toBe(true)
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'campaign-owner-transfer',
          status: 'passed',
        }),
        expect.objectContaining({
          id: 'campaign-lifecycle-authority',
          status: 'passed',
        }),
        expect.objectContaining({
          id: 'campaign-end-archive-persistence',
          status: 'passed',
        }),
        expect.objectContaining({
          id: 'campaign-delete-preserves-character-identity',
          status: 'passed',
        }),
      ]),
    )
  })
})
