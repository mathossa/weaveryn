import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { auth } from '@/lib/auth'
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

describe('Better Auth integration', () => {
  let createdEmail: string | null = null

  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    if (!createdEmail) return

    await prisma.user.deleteMany({ where: { email: createdEmail } })
    createdEmail = null
  })

  it('registers, hashes credentials, signs in, resolves the User, and signs out', async () => {
    createdEmail = `auth-integration-${randomUUID()}@weaveryn.local`

    await auth.api.signUpEmail({
      body: {
        email: createdEmail,
        password: PASSWORD,
        name: DISPLAY_NAME,
      },
    })

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: createdEmail },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    })
    expect(user.email).toBe(createdEmail)
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

    expect(
      await prisma.authSession.count({ where: { userId: user.id } }),
    ).toBe(0)

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
    expect(
      await prisma.authSession.count({ where: { userId: user.id } }),
    ).toBe(1)

    const resolvedUser = await requireAuthenticatedUser(sessionHeaders)
    expect(resolvedUser).toEqual({
      id: user.id,
      email: user.email,
      username: null,
      displayName: DISPLAY_NAME,
    })

    await auth.api.signOut({ headers: sessionHeaders })

    await expect(
      auth.api.getSession({ headers: sessionHeaders }),
    ).resolves.toBeNull()
    expect(
      await prisma.authSession.count({ where: { userId: user.id } }),
    ).toBe(0)
  })
})
