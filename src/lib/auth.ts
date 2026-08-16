import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
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
