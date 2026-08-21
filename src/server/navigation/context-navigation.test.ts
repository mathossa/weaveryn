import { describe, expect, it } from 'vitest'
import {
  buildCampaignContextHref,
  buildCharacterContextHref,
  buildWorldContextHref,
  ContextNavigationDomainError,
  parseContextNavigationInput,
} from './context-navigation'

describe('context navigation input', () => {
  it('parses context parameters', () => {
    expect(
      parseContextNavigationInput(
        new URLSearchParams({
          kind: 'campaign',
          worldId: 'world-1',
          campaignId: 'campaign-1',
          worldCharacterId: 'wc-1',
          mode: 'weaver',
        }),
      ),
    ).toEqual({
      kind: 'campaign',
      worldId: 'world-1',
      campaignId: 'campaign-1',
      worldCharacterId: 'wc-1',
      mode: 'weaver',
    })
  })

  it('rejects unknown context kinds and modes', () => {
    expect(() =>
      parseContextNavigationInput(new URLSearchParams({ kind: 'ruleset' })),
    ).toThrow(ContextNavigationDomainError)
    expect(() =>
      parseContextNavigationInput(
        new URLSearchParams({ kind: 'world', mode: 'preview' }),
      ),
    ).toThrow(ContextNavigationDomainError)
  })
})

describe('context navigation hrefs', () => {
  it('preserves explicit Weaver and Threadwatcher modes', () => {
    expect(buildWorldContextHref('world-1', 'weaver')).toBe(
      '/world/world-1?mode=weaver',
    )
    expect(buildWorldContextHref('world-1', 'threadwatcher')).toBe(
      '/world/world-1/campaign?mode=threadwatcher',
    )
  })

  it('preserves a Character when switching Campaign where allowed', () => {
    expect(
      buildCampaignContextHref({
        worldId: 'world-1',
        campaignId: 'campaign-2',
        worldCharacterId: 'wc-1',
      }),
    ).toBe('/world/world-1/campaign/campaign-2?character=wc-1')
  })

  it('keeps Character switching inside the active Campaign hierarchy', () => {
    expect(
      buildCharacterContextHref({
        worldId: 'world-1',
        campaignId: 'campaign-1',
        worldCharacterId: 'wc-2',
      }),
    ).toBe('/world/world-1/campaign/campaign-1?character=wc-2')
  })
})
