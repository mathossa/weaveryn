import { describe, expect, it } from 'vitest'
import {
  CampaignInputError,
  parseCampaignFormInput,
  parseCampaignManagementInput,
} from './campaign-input'

describe('Campaign UI input', () => {
  it('parses creation input including the temporary raw date fields', () => {
    expect(
      parseCampaignFormInput({
        name: 'Ashes of Aldorath',
        description: '  At the edge of an empire.  ',
        currentWorldPosition: '142.5',
        currentWorldDateLabel: '14 Emberwane, 812',
      }),
    ).toEqual({
      name: 'Ashes of Aldorath',
      description: 'At the edge of an empire.',
      currentWorldPosition: '142.5',
      currentWorldDateLabel: '14 Emberwane, 812',
    })
  })

  it('allows managed updates without a Campaign name', () => {
    expect(
      parseCampaignManagementInput({
        description: 'Updated',
        currentWorldPosition: '143',
        currentWorldDateLabel: '15 Emberwane, 812',
      }),
    ).toEqual({
      description: 'Updated',
      currentWorldPosition: '143',
      currentWorldDateLabel: '15 Emberwane, 812',
    })
  })

  it('rejects a non-numeric authoritative timeline position', () => {
    expect(() =>
      parseCampaignFormInput({
        name: 'Campaign',
        currentWorldPosition: 'next Tuesday',
        currentWorldDateLabel: 'Some day',
      }),
    ).toThrow(CampaignInputError)
  })
})
