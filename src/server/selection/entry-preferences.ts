import { prisma } from '@/lib/prisma'
import { getEntrySelection } from './entry-selection'

export const WEAVER_ENTRY_KEY = 'weaver'
export const WEAVER_CAMPAIGN_ENTRY_KEY_PREFIX = 'weaver-campaign'

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
  const selection = await getEntrySelection(userId)
  const character = selection.characters.find(
    (choice) => choice.id === worldCharacterId,
  )

  if (!character) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_NOT_AVAILABLE',
      'Character entry is not available.',
    )
  }

  if (campaignId) {
    const campaign = character.campaigns.find(
      (choice) => choice.id === campaignId,
    )
    if (!campaign) {
      throw new EntryPreferenceDomainError(
        'ENTRY_PREFERENCE_NOT_AVAILABLE',
        'Campaign entry is not available.',
      )
    }
    return { character, campaign }
  }

  if (character.campaigns.length > 0) {
    throw new EntryPreferenceDomainError(
      'ENTRY_PREFERENCE_NOT_AVAILABLE',
      'This WorldCharacter is entered through one of its Campaigns.',
    )
  }

  return { character, campaign: null }
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

export async function recordWeaverEntryUse(input: {
  userId: string
  worldId: string
  campaignId?: string | null
}) {
  const selection = await getEntrySelection(input.userId)
  const world = selection.weaverWorlds.find(
    (choice) => choice.id === input.worldId,
  )

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

export async function getWeaverResume(userId: string) {
  const [preference, selection] = await Promise.all([
    prisma.entryPreference.findUnique({
      where: {
        userId_entryKey: { userId, entryKey: WEAVER_ENTRY_KEY },
      },
      select: {
        worldId: true,
        campaignId: true,
        lastUsedAt: true,
      },
    }),
    getEntrySelection(userId),
  ])

  if (!preference?.worldId) return null
  const world = selection.weaverWorlds.find(
    (choice) => choice.id === preference.worldId,
  )
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
