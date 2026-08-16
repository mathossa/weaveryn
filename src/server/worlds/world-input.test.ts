import { describe, expect, it } from 'vitest'
import { WorldInputError, parseWorldFormInput } from './world-input'

describe('parseWorldFormInput', () => {
  it('trims valid World input', () => {
    expect(
      parseWorldFormInput({ name: '  Aldorath  ', description: '  Realm  ' }),
    ).toEqual({ name: 'Aldorath', description: 'Realm' })
  })

  it('normalizes an empty description to null', () => {
    expect(parseWorldFormInput({ name: 'Aldorath', description: '' })).toEqual({
      name: 'Aldorath',
      description: null,
    })
  })

  it('rejects an empty World name', () => {
    expect(() => parseWorldFormInput({ name: '   ' })).toThrow(WorldInputError)
  })

  it('rejects unexpected description types', () => {
    expect(() =>
      parseWorldFormInput({ name: 'Aldorath', description: 42 }),
    ).toThrow(WorldInputError)
  })
})
