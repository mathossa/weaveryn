import { describe, expect, it } from 'vitest'
import {
  AUTH_PASSWORD_MIN_LENGTH,
  normalizeUsername,
  shouldUseSecureAuthCookies,
  usernameValidationMessage,
} from './auth-policy'

describe('authentication policy', () => {
  it('keeps the MVP password minimum at or above 15 characters', () => {
    expect(AUTH_PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(15)
  })

  it('keeps production auth cookies secure outside the loopback E2E harness', () => {
    expect(
      shouldUseSecureAuthCookies({
        nodeEnv: 'production',
        baseURL: 'https://weaveryn.example.com',
      }),
    ).toBe(true)
    expect(
      shouldUseSecureAuthCookies({
        nodeEnv: 'production',
        baseURL: 'http://weaveryn.example.com',
        e2eRunId: 'test-run',
      }),
    ).toBe(true)
    expect(
      shouldUseSecureAuthCookies({
        nodeEnv: 'production',
        baseURL: 'http://127.0.0.1:3000',
        e2eRunId: 'test-run',
      }),
    ).toBe(false)
    expect(
      shouldUseSecureAuthCookies({
        nodeEnv: 'development',
        baseURL: 'http://localhost:3000',
      }),
    ).toBe(false)
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
