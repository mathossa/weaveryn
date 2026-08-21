import { prisma } from '@/lib/prisma'
import type { WeaverWorldChoice } from './entry-selection'

export const WEAVER_ENTRY_KEY = 'weaver'
export const WEAVER_CAMPAIGN_ENTRY_KEY_PREFIX = 'weaver-campaign'
export const PORTABLE_CHARACTER_ENTRY_KEY_PREFIX = 'portable-character'

export type EntryPreferenceErrorCode =
  'ENTRY_PREFERENCE_NOT_AVAILABLE' | 'ENTRY_PREFERENCE_INVALID'

export class EntryPreferenceDomainError extends Error {
  constructor(
    public readonly code: EntryPreferenceErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'EntryPreferenceDomainError'
  }
}

export interface CharacterEntryPinInput {
  worldCharacterId: string
  campaignId?: string | null
  pinned: boolean
}

export function parseCharacterEntryPinInput(
  value: unknown,
): CharacterEntryPinInput {
  if (!value || typeof value !== 'object') {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_INVALID',
      'Entry preference input must be an object.',
    )
  }

  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.worldCharacterId !== 'string' ||
    candidate.worldCharacterId.length === 0 ||
    typeof candidate.pinned !== 'boolean'
  ) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_INVALID',
      'A WorldCharacter and pinned state are required.',
    )
  }

  if (
    candidate.campaignId !== undefined &&
    candidate.campaignId !== null &&
    (typeof candidate.campaignId !== 'string' ||
      candidate.campaignId.length === 0)
  ) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_INVALID',
      'Campaign ID must be a non-empty string when provided.',
    )
  }

  return {
    worldCharacterId: candidate.worldCharacterId,
    campaignId:
      typeof candidate.campaignId === 'string' ? candidate.campaignId : null,
    pinned: candidate.pinned,
  }
}

export function characterEntryKey(
  worldCharacterId: string,
  campaignId?: string | null,
) {
  return `character:${worldCharacterId}:${campaignId ?? 'world'}`
}

export function portableCharacterEntryKey(characterId: string) {
  return `${PORTABLE_CHARACTER_ENTRY_KEY_PREFIX}:${characterId}`
}

export function weaverCampaignEntryKey(worldId: string, campaignId: string) {
  return `${WEAVER_CAMPAIGN_ENTRY_KEY_PREFIX}:${worldId}:${campaignId}`
}

export async function listEntryPreferences(userId: string) {
  return prisma.entryPreference.findMany({
    where: { userId },
    select: {
      entryKey: true,
      kind: true,
      pinned: true,
      lastUsedAt: true,
      worldCharacterId: true,
      campaignId: true,
      worldId: true,
    },
  })
}

async function requireCharacterEntry(
  userId: string,
  worldCharacterId: string,
  campaignId?: string | null,
) {
  const character = await prisma.worldCharacter.findFirst({
    where: {
      id: worldCharacterId,
      status: 'ACTIVE',
      character: { ownerUserId: userId, status: 'ACTIVE' },
      world: {
        OR: [
          { ownerId: userId },
          {
            memberships: {
              some: { userId, role: { in: ['ADMIN', 'MEMBER'] } },
            },
          },
          {
            campaigns: {
              some: {
                OR: [
                  { ownerId: userId },
                  {
                    memberships: {
                      some: {
                        userId,
                        role: { in: ['GM', 'ASSISTANT_GM', 'PLAYER'] },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    },
    select: {
      id: true,
      campaignCharacters: {
        where: {
          status: 'ACTIVE',
          campaign: {
            status: 'ACTIVE',
            OR: [
              { ownerId: userId },
              {
                memberships: {
                  some: {
                    userId,
                    role: { in: ['GM', 'ASSISTANT_GM', 'PLAYER'] },
                  },
                },
              },
            ],
          },
        },
        select: {
          campaign: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!character) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_NOT_AVAILABLE',
      'Character entry is not available.',
    )
  }

  if (campaignId) {
    const campaign = character.campaignCharacters.find(
      (choice) => choice.campaign.id === campaignId,
    )?.campaign
    if (!campaign) {
      throw new EntryPreferenceDomainError(
        'ENTRY_PREFERENCE_NOT_AVAILABLE',
        'Campaign entry is not available.',
      )
    }
    return { character, campaign }
  }

  if (character.campaignCharacters.length > 0) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_NOT_AVAILABLE',
      'This WorldCharacter is entered through one of its Campaigns.',
    )
  }

  return { character, campaign: null }
}

async function requirePortableCharacter(userId: string, characterId: string) {
  const character = await prisma.character.findFirst({
    where: { id: characterId, ownerUserId: userId, status: 'ACTIVE' },
    select: { id: true },
  })

  if (!character) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_NOT_AVAILABLE',
      'Portable Character entry is not available.',
    )
  }

  return character
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
    select: { id: true, name: true },
  })
}

async function findManageableWeaverCampaign(
  userId: string,
  worldId: string,
  campaignId: string,
) {
  return prisma.campaign.findFirst({
    where: {
      id: campaignId,
      worldId,
      status: 'ACTIVE',
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
    select: { id: true, name: true },
  })
}

export async function setCharacterEntryPinned(input: {
  userId: string
  worldCharacterId: string
  campaignId?: string | null
  pinned: boolean
}) {
  await requireCharacterEntry(
    input.userId,
    input.worldCharacterId,
    input.campaignId,
  )
  const entryKey = characterEntryKey(input.worldCharacterId, input.campaignId)

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
      worldCharacterId: input.worldCharacterId,
      campaignId: input.campaignId ?? null,
      pinned: input.pinned,
    },
    update: { pinned: input.pinned },
  })
}

export async function setWeaverCampaignEntryPinned(input: {
  userId: string
  worldId: string
  campaignId: string
  pinned: boolean
}) {
  const campaign = await findManageableWeaverCampaign(
    input.userId,
    input.worldId,
    input.campaignId,
  )
  if (!campaign) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_NOT_AVAILABLE',
      'Weaver Campaign is not available.',
    )
  }

  const entryKey = weaverCampaignEntryKey(input.worldId, input.campaignId)
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
      campaignId: input.campaignId,
      pinned: input.pinned,
    },
    update: { pinned: input.pinned },
  })
}

export async function recordCharacterEntryUse(input: {
  userId: string
  worldCharacterId: string
  campaignId?: string | null
}) {
  await requireCharacterEntry(
    input.userId,
    input.worldCharacterId,
    input.campaignId,
  )
  const entryKey = characterEntryKey(input.worldCharacterId, input.campaignId)
  const lastUsedAt = new Date()

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
      worldCharacterId: input.worldCharacterId,
      campaignId: input.campaignId ?? null,
      lastUsedAt,
    },
    update: { lastUsedAt },
  })
}

export async function recordPortableCharacterEntryUse(input: {
  userId: string
  characterId: string
}) {
  await requirePortableCharacter(input.userId, input.characterId)
  const entryKey = portableCharacterEntryKey(input.characterId)
  const lastUsedAt = new Date()

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
      lastUsedAt,
    },
    update: { lastUsedAt },
  })
}

export async function recordWeaverEntryUse(input: {
  userId: string
  worldId: string
  campaignId?: string | null
}) {
  const world = await findManageableWeaverWorld(input.userId, input.worldId)

  if (!world) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_NOT_AVAILABLE',
      'Weaver World is not available.',
    )
  }

  let campaignId: string | null = null
  if (input.campaignId) {
    const campaign = await findManageableWeaverCampaign(
      input.userId,
      input.worldId,
      input.campaignId,
    )
    if (!campaign) {
      throw new EntryPreferenceDomainError(
        'ENTRY_PREFERENCE_NOT_AVAILABLE',
        'Weaver Campaign is not available.',
      )
    }
    campaignId = campaign.id
  }

  const lastUsedAt = new Date()
  const resumePreference = prisma.entryPreference.upsert({
    where: {
      userId_entryKey: {
        userId: input.userId,
        entryKey: WEAVER_ENTRY_KEY,
      },
    },
    create: {
      userId: input.userId,
      entryKey: WEAVER_ENTRY_KEY,
      kind: 'WEAVER',
      worldId: input.worldId,
      campaignId,
      lastUsedAt,
    },
    update: {
      worldId: input.worldId,
      campaignId,
      lastUsedAt,
    },
  })

  if (!campaignId) return resumePreference

  const campaignPreference = prisma.entryPreference.upsert({
    where: {
      userId_entryKey: {
        userId: input.userId,
        entryKey: weaverCampaignEntryKey(input.worldId, campaignId),
      },
    },
    create: {
      userId: input.userId,
      entryKey: weaverCampaignEntryKey(input.worldId, campaignId),
      kind: 'WEAVER',
      worldId: input.worldId,
      campaignId,
      lastUsedAt,
    },
    update: { lastUsedAt },
  })

  const [preference] = await prisma.$transaction([
    resumePreference,
    campaignPreference,
  ])
  return preference
}

export async function getLatestCampaignEntryPreference(
  userId: string,
  campaignId: string,
) {
  return prisma.entryPreference.findFirst({
    where: {
      userId,
      campaignId,
      lastUsedAt: { not: null },
    },
    select: {
      kind: true,
      worldCharacterId: true,
      lastUsedAt: true,
    },
    orderBy: [{ lastUsedAt: 'desc' }, { id: 'asc' }],
  })
}

export async function getWeaverResume(
  userId: string,
  weaverWorlds?: readonly WeaverWorldChoice[],
) {
  const preference = await prisma.entryPreference.findUnique({
    where: {
      userId_entryKey: { userId, entryKey: WEAVER_ENTRY_KEY },
    },
    select: {
      worldId: true,
      campaignId: true,
      lastUsedAt: true,
    },
  })

  if (!preference?.worldId) return null
  const world = weaverWorlds
    ? (weaverWorlds.find((choice) => choice.id === preference.worldId) ?? null)
    : await findManageableWeaverWorld(userId, preference.worldId)
  if (!world) return null

  const campaign = preference.campaignId
    ? await findManageableWeaverCampaign(
        userId,
        preference.worldId,
        preference.campaignId,
      )
    : null

  return {
    world,
    campaign,
    lastUsedAt: preference.lastUsedAt,
  }
}
