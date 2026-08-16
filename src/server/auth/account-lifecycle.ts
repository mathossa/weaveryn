import { prisma } from '@/lib/prisma'

export type AccountDeletionBlocker = 'OWNED_CAMPAIGNS' | 'OWNED_CHARACTERS'

export class AccountDeletionBlockedError extends Error {
  readonly code = 'ACCOUNT_DELETION_BLOCKED'

  constructor(public readonly blockers: readonly AccountDeletionBlocker[]) {
    super(`Account deletion is blocked by: ${blockers.join(', ')}`)
    this.name = 'AccountDeletionBlockedError'
  }
}

export async function inspectAccountDeletion(userId: string) {
  const [ownedCampaigns, ownedCharacters, ownedWorlds] = await Promise.all([
    prisma.campaign.count({ where: { ownerId: userId } }),
    prisma.character.count({ where: { ownerUserId: userId } }),
    prisma.world.count({ where: { ownerId: userId } }),
  ])

  const blockers: AccountDeletionBlocker[] = []
  if (ownedCampaigns > 0) blockers.push('OWNED_CAMPAIGNS')
  if (ownedCharacters > 0) blockers.push('OWNED_CHARACTERS')

  return { blockers, ownedCampaigns, ownedCharacters, ownedWorlds }
}

export async function deleteAccount(userId: string) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) return { deleted: false as const, orphanedWorlds: 0 }

    const [ownedCampaigns, ownedCharacters] = await Promise.all([
      transaction.campaign.count({ where: { ownerId: userId } }),
      transaction.character.count({ where: { ownerUserId: userId } }),
    ])

    const blockers: AccountDeletionBlocker[] = []
    if (ownedCampaigns > 0) blockers.push('OWNED_CAMPAIGNS')
    if (ownedCharacters > 0) blockers.push('OWNED_CHARACTERS')
    if (blockers.length > 0) throw new AccountDeletionBlockedError(blockers)

    // Account deletion follows the same orphaning rule as Issue #13: the World
    // survives and keeps its ID/content/Campaign links while ownership becomes null.
    const orphanedWorlds = await transaction.world.updateMany({
      where: { ownerId: userId },
      data: { ownerId: null },
    })

    // Memberships and Better Auth account/session rows are explicitly modeled with
    // user-scoped cascade deletion. Campaign/Character ownership uses Restrict and
    // was validated above, so independently owned content cannot disappear here.
    await transaction.user.delete({ where: { id: userId } })

    return { deleted: true as const, orphanedWorlds: orphanedWorlds.count }
  })
}
