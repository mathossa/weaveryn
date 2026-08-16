import { prisma } from '@/lib/prisma'
import {
  instanceAdminUserNotFound,
  lastInstanceAdminCannotBeDemoted,
} from './instance-admin-errors'

export type InstanceAdminDatabase = Pick<typeof prisma, 'user' | '$transaction'>

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase()
}

export function createInstanceAdminService(
  database: InstanceAdminDatabase = prisma,
) {
  return {
    async promoteByEmail(email: string) {
      const normalizedEmail = normalizeIdentifier(email)
      const user = await database.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true, isInstanceAdmin: true },
      })

      if (!user) throw instanceAdminUserNotFound(normalizedEmail)
      if (user.isInstanceAdmin) return user

      return database.user.update({
        where: { id: user.id },
        data: { isInstanceAdmin: true },
        select: { id: true, email: true, isInstanceAdmin: true },
      })
    },

    async demoteByEmail(email: string) {
      const normalizedEmail = normalizeIdentifier(email)

      return database.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, email: true, isInstanceAdmin: true },
        })

        if (!user) throw instanceAdminUserNotFound(normalizedEmail)
        if (!user.isInstanceAdmin) return user

        const adminCount = await transaction.user.count({
          where: { isInstanceAdmin: true },
        })
        if (adminCount <= 1) throw lastInstanceAdminCannotBeDemoted()

        return transaction.user.update({
          where: { id: user.id },
          data: { isInstanceAdmin: false },
          select: { id: true, email: true, isInstanceAdmin: true },
        })
      })
    },
  }
}

export const instanceAdminService = createInstanceAdminService()
