import { prisma } from '@/lib/prisma'
import {
  EntryPreferenceDomainError,
  portableCharacterEntryKey,
} from './entry-preferences'

export async function setPortableCharacterEntryPinned(input: {
  userId: string
  characterId: string
  pinned: boolean
}) {
  const character = await prisma.character.findFirst({
    where: {
      id: input.characterId,
      ownerUserId: input.userId,
      status: 'ACTIVE',
    },
    select: { id: true },
  })

  if (!character) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_NOT_AVAILABLE',
      'Portable Character entry is not available.',
    )
  }

  const entryKey = portableCharacterEntryKey(input.characterId)
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
      kind: 'CHARACTER',
      pinned: input.pinned,
    },
    update: { pinned: input.pinned },
  })
}
