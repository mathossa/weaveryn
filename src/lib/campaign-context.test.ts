import { describe, expect, it } from 'vitest'
import {
  requestedCharacterContext,
  withCharacterContext,
} from './campaign-context'

describe('campaign character context URLs', () => {
  it('adds a character query to a plain Campaign URL', () => {
    expect(withCharacterContext('/world/w/campaign/c', 'character-1')).toBe(
      '/world/w/campaign/c?character=character-1',
    )
  })

  it('appends character context to an existing query', () => {
    expect(
      withCharacterContext(
        '/world/w/entities?campaign=campaign-1',
        'character-1',
      ),
    ).toBe('/world/w/entities?campaign=campaign-1&character=character-1')
  })

  it('leaves URLs unchanged without Character context', () => {
    expect(withCharacterContext('/world/w/campaign/c')).toBe(
      '/world/w/campaign/c',
    )
  })

  it('only accepts a single non-empty character search value', () => {
    expect(requestedCharacterContext('character-1')).toBe('character-1')
    expect(requestedCharacterContext('')).toBeUndefined()
    expect(requestedCharacterContext(['character-1'])).toBeUndefined()
    expect(requestedCharacterContext(undefined)).toBeUndefined()
  })
})
