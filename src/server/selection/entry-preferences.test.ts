import { describe, expect, it } from 'vitest'
import {
  EntryPreferenceDomainError,
  characterEntryKey,
  parseCharacterEntryPinInput,
  portableCharacterEntryKey,
} from './entry-preferences'

describe('entry preferences', () => {
  it('builds distinct keys for World, Campaign, and portable Character entries', () => {
    expect(characterEntryKey('world-character-1')).toBe(
      'character:world-character-1:world',
    )
    expect(characterEntryKey('world-character-1', 'campaign-1')).toBe(
      'character:world-character-1:campaign-1',
    )
    expect(portableCharacterEntryKey('character-1')).toBe(
      'portable-character:character-1',
    )
  })

  it('parses a pin preference update', () => {
    expect(
      parseCharacterEntryPinInput({
        worldCharacterId: 'world-character-1',
        campaignId: 'campaign-1',
        pinned: true,
      }),
    ).toEqual({
      worldCharacterId: 'world-character-1',
      campaignId: 'campaign-1',
      pinned: true,
    })
  })

  it('rejects malformed pin preference input', () => {
    expect(() =>
      parseCharacterEntryPinInput({
        worldCharacterId: '',
        pinned: 'yes',
      }),
    ).toThrowError(EntryPreferenceDomainError)
  })
})
