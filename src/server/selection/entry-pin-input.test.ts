import { describe, expect, it } from 'vitest'
import { EntryPreferenceDomainError } from './entry-preferences'
import { parseEntryPinInput } from './entry-pin-input'

describe('entry pin input', () => {
  it('parses a WorldCharacter pin update', () => {
    expect(
      parseEntryPinInput({
        worldCharacterId: 'world-character-1',
        campaignId: 'campaign-1',
        pinned: true,
      }),
    ).toEqual({
      kind: 'CHARACTER',
      worldCharacterId: 'world-character-1',
      campaignId: 'campaign-1',
      pinned: true,
    })
  })

  it('parses a portable Character pin update', () => {
    expect(
      parseEntryPinInput({
        characterId: 'character-1',
        pinned: false,
      }),
    ).toEqual({
      kind: 'PORTABLE_CHARACTER',
      characterId: 'character-1',
      pinned: false,
    })
  })

  it('rejects malformed pin input', () => {
    expect(() =>
      parseEntryPinInput({
        characterId: '',
        pinned: 'yes',
      }),
    ).toThrowError(EntryPreferenceDomainError)
  })
})
