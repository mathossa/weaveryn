import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { AUTH_PASSWORD_MIN_LENGTH } from './auth-policy'
import { prisma } from './prisma'

const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : undefined)

export const auth = betterAuth({
  baseURL,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false,
    minPasswordLength: AUTH_PASSWORD_MIN_LENGTH,
  },
  user: {
    modelName: 'User',
    fields: {
      name: 'displayName',
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
