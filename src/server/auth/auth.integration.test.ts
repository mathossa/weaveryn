import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { auth } from '@/lib/auth'
import { normalizeUsername } from '@/lib/auth-policy'
import { prisma } from '@/lib/prisma'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
import { requireAuthenticatedUser } from './authenticated-user'

const PASSWORD = 'Weaveryn-Auth-Integration-123!'
const DISPLAY_NAME = 'Auth Integration Test'

function requestHeadersFromSetCookie(responseHeaders: Headers) {
  const headersWithGetSetCookie = responseHeaders as Headers & {
    getSetCookie?: () => string[]
  }
  const setCookies =
    headersWithGetSetCookie.getSetCookie?.() ??
    (responseHeaders.get('set-cookie')
      ? [responseHeaders.get('set-cookie') as string]
      : [])

  const cookies = setCookies
    .map((value) => value.split(';', 1)[0])
    .filter(Boolean)

  if (cookies.length === 0) {
    throw new Error('Better Auth sign-in did not return a session cookie.')
  }

  return new Headers({ cookie: cookies.join('; ') })
}

function uniqueUsername(prefix = 'auth') {
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 12)}`
}

describe('Better Auth integration', () => {
  const createdEmails: string[] = []

  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    if (createdEmails.length === 0) return

    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } })
    createdEmails.length = 0
  })

  it('registers with a normalized username, hashes credentials, signs in, resolves the User, and signs out', async () => {
    const createdEmail = `auth-integration-${randomUUID()}@weaveryn.local`
    const submittedUsername = uniqueUsername('Auth')
    const username = normalizeUsername(submittedUsername)
    createdEmails.push(createdEmail)

    await auth.api.signUpEmail({
      body: {
        email: createdEmail,
        password: PASSWORD,
        name: DISPLAY_NAME,
        username: submittedUsername,
      },
    })

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: createdEmail },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
      },
    })
    expect(user.email).toBe(createdEmail)
    expect(user.username).toBe(username)
    expect(user.displayName).toBe(DISPLAY_NAME)

    const credential = await prisma.authAccount.findFirstOrThrow({
      where: { userId: user.id, providerId: 'credential' },
      select: { password: true },
    })
    expect(credential.password).toBeTruthy()
    expect(credential.password).not.toBe(PASSWORD)

    await expect(
      auth.api.signInEmail({
        body: {
          email: createdEmail,
          password: 'definitely-the-wrong-password',
        },
      }),
    ).rejects.toBeDefined()

    expect(await prisma.authSession.count({ where: { userId: user.id } })).toBe(
      0,
    )

    const signIn = await auth.api.signInEmail({
      returnHeaders: true,
      body: {
        email: createdEmail,
        password: PASSWORD,
      },
    })
    const sessionHeaders = requestHeadersFromSetCookie(signIn.headers)

    const session = await auth.api.getSession({ headers: sessionHeaders })
    expect(session?.user.id).toBe(user.id)
    expect(await prisma.authSession.count({ where: { userId: user.id } })).toBe(
      1,
    )

    const resolvedUser = await requireAuthenticatedUser(sessionHeaders)
    expect(resolvedUser).toEqual({
      id: user.id,
      email: user.email,
      username,
      displayName: DISPLAY_NAME,
    })

    await auth.api.signOut({ headers: sessionHeaders })

    await expect(
      auth.api.getSession({ headers: sessionHeaders }),
    ).resolves.toBeNull()
    expect(await prisma.authSession.count({ where: { userId: user.id } })).toBe(
      0,
    )
  })

  it('rejects registration when username is missing or invalid', async () => {
    const missingEmail = `auth-missing-${randomUUID()}@weaveryn.local`
    const invalidEmail = `auth-invalid-${randomUUID()}@weaveryn.local`
    createdEmails.push(missingEmail, invalidEmail)

    const missingUsername = {} as { username: string }
    await expect(
      auth.api.signUpEmail({
        body: {
          email: missingEmail,
          password: PASSWORD,
          name: DISPLAY_NAME,
          ...missingUsername,
        },
      }),
    ).rejects.toBeDefined()

    await expect(
      auth.api.signUpEmail({
        body: {
          email: invalidEmail,
          password: PASSWORD,
          name: DISPLAY_NAME,
          username: 'Admin',
        },
      }),
    ).rejects.toBeDefined()

    expect(
      await prisma.user.count({
        where: { email: { in: [missingEmail, invalidEmail] } },
      }),
    ).toBe(0)
  })

  it('rejects a case-insensitive duplicate username', async () => {
    const firstEmail = `auth-duplicate-a-${randomUUID()}@weaveryn.local`
    const secondEmail = `auth-duplicate-b-${randomUUID()}@weaveryn.local`
    const username = uniqueUsername('case')
    createdEmails.push(firstEmail, secondEmail)

    await auth.api.signUpEmail({
      body: {
        email: firstEmail,
        password: PASSWORD,
        name: DISPLAY_NAME,
        username,
      },
    })

    await expect(
      auth.api.signUpEmail({
        body: {
          email: secondEmail,
          password: PASSWORD,
          name: DISPLAY_NAME,
          username: username.toUpperCase(),
        },
      }),
    ).rejects.toBeDefined()

    expect(await prisma.user.count({ where: { username } })).toBe(1)
    expect(await prisma.user.count({ where: { email: secondEmail } })).toBe(0)
  })
})
