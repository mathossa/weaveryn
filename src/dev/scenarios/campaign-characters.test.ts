import { describe, expect, it } from 'vitest'
import { isCampaignCharactersScenarioAction } from './campaign-characters'

describe('CampaignCharacter visual scenario action validation', () => {
  it('accepts only fixed registered actions', () => {
    expect(
      isCampaignCharactersScenarioAction({ action: 'add-first-participation' }),
    ).toBe(true)
    expect(
      isCampaignCharactersScenarioAction({
        action: 'try-cross-world-participation',
      }),
    ).toBe(true)
  })

  it('rejects arbitrary IDs and extra request fields', () => {
    expect(
      isCampaignCharactersScenarioAction({ action: 'delete-character' }),
    ).toBe(false)
    expect(
      isCampaignCharactersScenarioAction({
        action: 'remove-first-participation',
        id: 'arbitrary',
      }),
    ).toBe(false)
  })
})
