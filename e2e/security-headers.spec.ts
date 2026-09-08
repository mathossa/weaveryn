import { expect, test } from '@playwright/test'
import { E2EProductionServer } from './support/server'

const server = new E2EProductionServer()

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await server.start()
})

test.afterAll(async () => {
  await server.stop()
})

test('production responses include the intended security headers', async () => {
  const response = await fetch(`${server.baseURL}/login`, {
    redirect: 'manual',
  })

  expect(response.status).toBe(200)

  const contentSecurityPolicy =
    response.headers.get('content-security-policy') ?? ''

  expect(contentSecurityPolicy).toContain("default-src 'self'")
  expect(contentSecurityPolicy).toContain("object-src 'none'")
  expect(contentSecurityPolicy).toContain("frame-ancestors 'self'")
  expect(contentSecurityPolicy).not.toContain("'unsafe-eval'")

  expect(response.headers.get('strict-transport-security')).toBe(
    'max-age=31536000; includeSubDomains',
  )
  expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN')
  expect(response.headers.get('referrer-policy')).toBe(
    'strict-origin-when-cross-origin',
  )
  expect(response.headers.get('permissions-policy')).toContain('camera=()')
  expect(response.headers.get('x-powered-by')).toBeNull()
})
