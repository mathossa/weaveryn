import { prisma } from '@/lib/prisma'
import { orphanOwnedWorldsForAccountDeletion } from '@/server/worlds/world-orphan-lifecycle-service'
import {
  accountDeletionBlocked,
  accountNotFound,
  type AccountDeletionBlocker,
} from './account-lifecycle-errors'

type Transaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export interface AccountDeletionPreflight {
  userId: string
  canDelete: boolean
  blockers: AccountDeletionBlocker[]
  ownedCampaignCount: number
  ownedCharacterCount: number
  ownedWorldCount: number
}

export type AccountLifecycleDatabase = Pick<typeof prisma, '$transaction'>

async function readPreflight(
  transaction: Transaction,
  userId: string,
): Promise<AccountDeletionPreflight> {
  const user = await transaction.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!user) throw accountNotFound(userId)

  const [ownedCampaignCount, ownedCharacterCount, ownedWorldCount] =
    await Promise.all([
      transaction.campaign.count({ where: { ownerId: userId } }),
      transaction.character.count({ where: { ownerUserId: userId } }),
      transaction.world.count({ where: { ownerId: userId } }),
    ])

  const blockers: AccountDeletionBlocker[] = []
  if (ownedCampaignCount > 0) blockers.push('CAMPAIGNS')
  if (ownedCharacterCount > 0) blockers.push('CHARACTERS')

  return {
    userId,
    canDelete: blockers.length === 0,
    blockers,
    ownedCampaignCount,
    ownedCharacterCount,
    ownedWorldCount,
  }
}

export function createAccountLifecycleService(
  database: AccountLifecycleDatabase = prisma,
) {
  return {
    async preflightAccountDeletion(userId: string) {
      return database.$transaction((transaction) =>
        readPreflight(transaction, userId),
      )
    },

    async deleteAccount(userId: string) {
      return database.$transaction(async (transaction) => {
        const preflight = await readPreflight(transaction, userId)
        if (!preflight.canDelete) {
          throw accountDeletionBlocked(preflight.blockers)
        }

        const orphanedWorlds = await orphanOwnedWorldsForAccountDeletion(
          transaction,
          userId,
        )

        await transaction.user.delete({ where: { id: userId } })

        return {
          userId,
          orphanedWorldIds: orphanedWorlds.map((world) => world.id),
        }
      })
    },
  }
}

export const accountLifecycleService = createAccountLifecycleService()
