import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const hubSource = readFileSync(new URL('../page.tsx', import.meta.url), 'utf8')
const advancedSource = readFileSync(
  new URL('../advanced/page.tsx', import.meta.url),
  'utf8',
)

describe('Campaign management route structure', () => {
  it('uses cards without redundant tabs on the management hub', () => {
    expect(hubSource).toContain('Campaign details')
    expect(hubSource).toContain('Members &amp; roles')
    expect(hubSource).toContain('Characters')
    expect(hubSource).toContain('World time')
    expect(hubSource).toContain('Advanced')
    expect(hubSource).not.toContain('<nav')
  })

  it('keeps high-impact controls out of the hub and on Advanced', () => {
    for (const control of [
      'CampaignOwnershipTransferControl',
      'CampaignLifecycleControls',
      'CampaignDeleteControl',
    ]) {
      expect(hubSource).not.toContain(control)
      expect(advancedSource).toContain(control)
    }
  })
})
