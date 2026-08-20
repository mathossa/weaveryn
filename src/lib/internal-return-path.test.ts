import { describe, expect, it } from 'vitest'
import { normalizeInternalReturnPath } from './internal-return-path'

describe('normalizeInternalReturnPath', () => {
  it('keeps local application paths', () => {
    expect(normalizeInternalReturnPath('/invite/example?source=link')).toBe(
      '/invite/example?source=link',
    )
  })

  it.each([
    'https://example.com/invite',
    '//example.com/invite',
    '/\\example.com/invite',
    'invite/example',
    '',
  ])('rejects unsafe or non-local path %s', (value) => {
    expect(normalizeInternalReturnPath(value)).toBe('/select')
  })

  it('uses the supplied fallback for non-string input', () => {
    expect(normalizeInternalReturnPath(undefined, '/login')).toBe('/login')
  })
})
