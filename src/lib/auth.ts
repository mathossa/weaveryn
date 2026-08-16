import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import {
  AUTH_PASSWORD_MIN_LENGTH,
  normalizeUsername,
  usernameValidationMessage,
} from './auth-policy'
import { prisma } from './prisma'

const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : undefined)

const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

type UsernameInput = { username?: unknown }

function validUsername(value: unknown) {
  if (typeof value !== 'string') {
    throw new APIError('BAD_REQUEST', { message: 'Username is required.' })
  }

  const validationMessage = usernameValidationMessage(value)
  if (validationMessage) {
    throw new APIError('BAD_REQUEST', { message: validationMessage })
  }

  return normalizeUsername(value)
}

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false,
    minPasswordLength: AUTH_PASSWORD_MIN_LENGTH,
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    modelName: 'User',
    fields: {
      name: 'displayName',
    },
    additionalFields: {
      username: {
        type: 'string',
        required: true,
        input: true,
        returned: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const username = validUsername((user as UsernameInput).username)
          const existing = await prisma.user.findUnique({
            where: { username },
            select: { id: true },
          })

          if (existing) {
            throw new APIError('BAD_REQUEST', {
              message: 'That username is already in use.',
            })
          }

          return { data: { ...user, username } }
        },
      },
      update: {
        before: async (user) => {
          if ((user as UsernameInput).username !== undefined) {
            throw new APIError('BAD_REQUEST', {
              message: 'Username changes are not supported yet.',
            })
          }

          return { data: user }
        },
      },
    },
  },
  session: {
    modelName: 'AuthSession',
  },
  account: {
    modelName: 'AuthAccount',
  },
  verification: {
    modelName: 'AuthVerification',
  },
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
})
