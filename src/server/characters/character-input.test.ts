import { describe, expect, it } from 'vitest'
import {
  parseAttachCampaignCharacterInput,
  parseCreateCharacterInput,
  parseCreateWorldCharacterInput,
  parseUpdateWorldCharacterInput,
} from './character-input'

describe('character input', () => {
  it('normalizes portable Character names', () => {
    expect(parseCreateCharacterInput({ name: '  Bodwick  ' })).toEqual({
      name: 'Bodwick',
    })
  })

  it('rejects missing portable Character names', () => {
    expect(() => parseCreateCharacterInput({ name: '   ' })).toThrow(
      'Character name is required.',
    )
  })

  it('normalizes an empty World-specific name to null', () => {
    expect(
      parseCreateWorldCharacterInput({
        worldId: 'world-1',
        nameOverride: '   ',
      }),
    ).toEqual({ worldId: 'world-1', nameOverride: null })
    expect(parseUpdateWorldCharacterInput({ nameOverride: '' })).toEqual({
      nameOverride: null,
    })
  })

  it('accepts simple typed Character additional details', () => {
    expect(
      parseUpdateWorldCharacterInput({
        customFields: {
          ' Former occupation ': '  Blacksmith  ',
          Reputation: 4,
          Wanted: false,
        },
      }),
    ).toEqual({
      customFields: {
        'Former occupation': 'Blacksmith',
        Reputation: 4,
        Wanted: false,
      },
    })
  })

  it('rejects structured Character additional details', () => {
    expect(() =>
      parseUpdateWorldCharacterInput({
        customFields: { Secret: { nested: true } },
      }),
    ).toThrow('Secret must be text, a number, or true/false.')
  })

  it('requires a Campaign id before participation is attached', () => {
    expect(() => parseAttachCampaignCharacterInput({ campaignId: '' })).toThrow(
      'Campaign is required.',
    )
  })
})
