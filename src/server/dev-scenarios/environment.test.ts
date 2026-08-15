import { describe, expect, it } from 'vitest'
import {
  assertSafeDevEnvironment,
  databaseNameFromUrl,
  DevEnvironmentError,
  getDevEnvironmentStatus,
  isClearlyDevelopmentDatabaseName,
} from './environment'

describe('development scenario environment guard', () => {
  it('extracts encoded database names without exposing connection details', () => {
    expect(
      databaseNameFromUrl(
        'postgresql://user:secret@localhost:5432/weaveryn%5Fdev?schema=public'
      )
    ).toBe('weaveryn_dev')
  })

  it.each(['weaveryn_dev', 'dev_weaveryn', 'weaveryn-test-34'])(
    'recognizes clearly isolated database name %s',
    (name) => {
      expect(isClearlyDevelopmentDatabaseName(name)).toBe(true)
    }
  )

  it.each(['weaveryn', 'production', 'customer_data'])(
    'rejects ambiguous database name %s',
    (name) => {
      expect(isClearlyDevelopmentDatabaseName(name)).toBe(false)
    }
  )

  it('allows only the explicitly expected development database', () => {
    const status = getDevEnvironmentStatus({
      NODE_ENV: 'development',
      DEV_DATABASE_NAME: 'weaveryn_dev',
      DATABASE_URL: 'postgresql://user:secret@localhost:5432/weaveryn_dev',
    })

    expect(status).toMatchObject({
      safe: true,
      expectedDatabaseName: 'weaveryn_dev',
      actualDatabaseName: 'weaveryn_dev',
    })
  })

  it('blocks a normal or production-looking database even outside production', () => {
    expect(() =>
      assertSafeDevEnvironment({
        NODE_ENV: 'development',
        DEV_DATABASE_NAME: 'weaveryn_dev',
        DATABASE_URL: 'postgresql://user:secret@localhost:5432/weaveryn',
      })
    ).toThrowError(
      expect.objectContaining<Partial<DevEnvironmentError>>({
        code: 'UNSAFE_DEV_DATABASE',
      })
    )
  })

  it('blocks all scenario access in production', () => {
    expect(getDevEnvironmentStatus({ NODE_ENV: 'production' })).toMatchObject({
      safe: false,
      code: 'DEV_TOOLS_DISABLED',
    })
  })
})
