import { describe, expect, it } from 'vitest'
import {
  AUTH_PASSWORD_MIN_LENGTH,
  normalizeUsername,
  usernameValidationMessage,
} from './auth-policy'

describe('authentication policy', () => {
  it('keeps the MVP password minimum at or above 15 characters', () => {
    expect(AUTH_PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(15)
  })

  it('normalizes usernames to trimmed lowercase', () => {
    expect(normalizeUsername('  Mathossa.Player  ')).toBe('mathossa.player')
  })

  it('accepts supported public handles', () => {
    expect(usernameValidationMessage('mathossa')).toBeNull()
    expect(usernameValidationMessage('mathossa.player-2')).toBeNull()
  })

  it('rejects invalid formatting and reserved names', () => {
    expect(usernameValidationMessage('ab')).toMatch(/3-30/)
    expect(usernameValidationMessage('_mathossa')).toMatch(/start and end/)
    expect(usernameValidationMessage('mathossa!')).toMatch(/letters, numbers/)
    expect(usernameValidationMessage('Admin')).toMatch(/reserved/)
  })
})
