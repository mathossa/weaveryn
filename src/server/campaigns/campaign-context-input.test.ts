import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_CURRENT_FOCUS_MAX_LENGTH,
  parseCampaignContextUpdateInput,
} from './campaign-context-input'

describe('parseCampaignContextUpdateInput', () => {
  it('normalizes nullable location and short player-visible focus fields', () => {
    expect(
      parseCampaignContextUpdateInput({
        currentLocationId: ' location-1 ',
        currentFocus: ' Find the eastern gate. ',
      }),
    ).toEqual({
      currentLocationId: 'location-1',
      currentFocus: 'Find the eastern gate.',
    })
    expect(parseCampaignContextUpdateInput({ currentFocus: '   ' })).toEqual({
      currentFocus: null,
    })
  })

  it('rejects empty updates, invalid location values, and oversized focus text', () => {
    expect(() => parseCampaignContextUpdateInput({})).toThrow(
      'Current Location or current focus must be provided.',
    )
    expect(() =>
      parseCampaignContextUpdateInput({ currentLocationId: 42 }),
    ).toThrow('Current Location must be text or null.')
    expect(() =>
      parseCampaignContextUpdateInput({
        currentFocus: 'x'.repeat(CAMPAIGN_CURRENT_FOCUS_MAX_LENGTH + 1),
      }),
    ).toThrow('Current focus must be 280 characters or fewer.')
  })
})
