import { prisma } from '@/lib/prisma'
import { EntryPreferenceDomainError } from './entry-preferences'

export const WEAVER_WORLD_ENTRY_KEY_PREFIX = 'weaver-world'

export function weaverWorldEntryKey(worldId: string) {
  return `${WEAVER_WORLD_ENTRY_KEY_PREFIX}:${worldId}`
}

async function findManageableWeaverWorld(userId: string, worldId: string) {
  return prisma.world.findFirst({
    where: {
      id: worldId,
      OR: [
        { ownerId: userId },
        { memberships: { some: { userId, role: 'ADMIN' } } },
        {
          campaigns: {
            some: {
              OR: [
                { ownerId: userId },
                {
                  memberships: {
                    some: {
                      userId,
                      role: { in: ['GM', 'ASSISTANT_GM'] },
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    select: { id: true },
  })
}

export async function setWeaverWorldEntryPinned(input: {
  userId: string
  worldId: string
  pinned: boolean
}) {
  const world = await findManageableWeaverWorld(input.userId, input.worldId)
  if (!world) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_NOT_AVAILABLE',
      'Weaver World is not available.',
    )
  }

  const entryKey = weaverWorldEntryKey(input.worldId)
  return prisma.entryPreference.upsert({
    where: {
      userId_entryKey: {
        userId: input.userId,
        entryKey,
      },
    },
    create: {
      userId: input.userId,
      entryKey,
      kind: 'WEAVER',
      worldId: input.worldId,
      pinned: input.pinned,
    },
    update: { pinned: input.pinned },
  })
}
