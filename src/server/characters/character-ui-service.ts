import { portableCharacterIdentity } from '@/lib/portable-character-identity'
import {
  normalizeWorldCharacterCustomFields,
  normalizeWorldCharacterProfile,
  type WorldCharacterCustomFields,
  type WorldCharacterProfile,
} from '@/lib/world-character-profile'
import { prisma } from '@/lib/prisma'

export type CharacterCampaignRole =
  'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'

export interface CharacterWorldIncarnationChoice {
  id: string
  name: string
  world: { id: string; name: string }
  campaignIds: string[]
}

export interface PortableCharacterChoice {
  id: string
  name: string
  image: string | null
  worldCharacters: CharacterWorldIncarnationChoice[]
}

export interface PortableCharacterOverview extends PortableCharacterChoice {
  unavailableWorldCharacters: CharacterWorldIncarnationChoice[]
  availableWorlds: Array<{ id: string; name: string }>
}

export interface WorldCharacterCampaignParticipation {
  id: string
  status: string
  campaign: {
    id: string
    name: string
    status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
    role: CharacterCampaignRole
  }
}

export interface WorldCharacterCampaignOption {
  id: string
  name: string
  role: Exclude<CharacterCampaignRole, 'SPECTATOR'>
}

export interface WorldCharacterOverview {
  id: string
  nameOverride: string | null
  displayName: string
  status: string
  worldEntityId: string | null
  character: { id: string; name: string; image: string | null }
  world: { id: string; name: string }
  canEditWorldIdentity: boolean
  hasCampaignParticipation: boolean
  profile: WorldCharacterProfile
  customFields: WorldCharacterCustomFields
  recentCampaignId: string | null
  participations: WorldCharacterCampaignParticipation[]
  availableCampaigns: WorldCharacterCampaignOption[]
}

function campaignRole(input: {
  ownerId: string
  userId: string
  membershipRole: CharacterCampaignRole | null
}): CharacterCampaignRole {
  if (input.ownerId === input.userId) return 'GM'
  return input.membershipRole ?? 'SPECTATOR'
}

function hasPlayableWorldCharacterAccess(input: {
  userId: string
  ownerId: string | null
  worldRole: string | null
  playableCampaignCount: number
}) {
  return (
    input.ownerId === input.userId ||
    input.worldRole === 'ADMIN' ||
    input.worldRole === 'MEMBER' ||
    input.playableCampaignCount > 0
  )
}

export async function listOwnedCharacterChoices(
  userId: string,
): Promise<PortableCharacterChoice[]> {
  const characters = await prisma.character.findMany({
    where: { ownerUserId: userId, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      image: true,
      worldCharacters: {
        where: {
          status: 'ACTIVE',
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
          nameOverride: true,
          world: { select: { id: true, name: true } },
          campaignCharacters: {
            where: {
              status: 'ACTIVE',
              campaign: {
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
            select: { campaignId: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  })

  return characters.map((character) => ({
    id: character.id,
    name: character.name,
    image: character.image,
    worldCharacters: character.worldCharacters.map((worldCharacter) => ({
      id: worldCharacter.id,
      name: worldCharacter.nameOverride ?? character.name,
      world: worldCharacter.world,
      campaignIds: worldCharacter.campaignCharacters.map(
        (participation) => participation.campaignId,
      ),
    })),
  }))
}

export async function getPortableCharacterOverview(
  characterId: string,
  userId: string,
): Promise<PortableCharacterOverview | null> {
  const character = await prisma.character.findFirst({
    where: { id: characterId, ownerUserId: userId },
    select: {
      id: true,
      name: true,
      image: true,
      worldCharacters: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          nameOverride: true,
          world: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              memberships: {
                where: { userId },
                select: { role: true },
                take: 1,
              },
              campaigns: {
                where: {
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
                select: { id: true },
                take: 1,
              },
            },
          },
          campaignCharacters: {
            where: {
              status: 'ACTIVE',
              campaign: {
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
            select: { campaignId: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      },
    },
  })

  if (!character) return null

  const existingWorldIds = character.worldCharacters.map(
    (worldCharacter) => worldCharacter.world.id,
  )
  const availableWorlds = await prisma.world.findMany({
    where: {
      ...(existingWorldIds.length > 0
        ? { id: { notIn: existingWorldIds } }
        : {}),
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
    select: { id: true, name: true },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
  })

  const worldCharacters = character.worldCharacters.map((worldCharacter) => ({
    choice: {
      id: worldCharacter.id,
      name: worldCharacter.nameOverride ?? character.name,
      world: {
        id: worldCharacter.world.id,
        name: worldCharacter.world.name,
      },
      campaignIds: worldCharacter.campaignCharacters.map(
        (participation) => participation.campaignId,
      ),
    },
    available: hasPlayableWorldCharacterAccess({
      userId,
      ownerId: worldCharacter.world.ownerId,
      worldRole: worldCharacter.world.memberships[0]?.role ?? null,
      playableCampaignCount: worldCharacter.world.campaigns.length,
    }),
  }))

  return {
    id: character.id,
    name: character.name,
    image: character.image,
    worldCharacters: worldCharacters
      .filter((worldCharacter) => worldCharacter.available)
      .map((worldCharacter) => worldCharacter.choice),
    unavailableWorldCharacters: worldCharacters
      .filter((worldCharacter) => !worldCharacter.available)
      .map((worldCharacter) => worldCharacter.choice),
    availableWorlds,
  }
}

export async function getWorldCharacterOverview(
  worldCharacterId: string,
  userId: string,
): Promise<WorldCharacterOverview | null> {
  const worldCharacter = await prisma.worldCharacter.findFirst({
    where: { id: worldCharacterId, character: { ownerUserId: userId } },
    select: {
      id: true,
      nameOverride: true,
      worldData: true,
      status: true,
      worldEntity: { select: { id: true } },
      character: {
        select: { id: true, name: true, image: true, coreData: true },
      },
      _count: { select: { campaignCharacters: true } },
      entryPreferences: {
        where: {
          userId,
          campaignId: { not: null },
          lastUsedAt: { not: null },
        },
        select: { campaignId: true },
        orderBy: { lastUsedAt: 'desc' },
        take: 1,
      },
      world: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          memberships: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
          campaigns: {
            where: {
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
            select: { id: true },
            take: 1,
          },
        },
      },
      campaignCharacters: {
        where: {
          campaign: {
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
          id: true,
          status: true,
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
              ownerId: true,
              memberships: {
                where: { userId },
                select: { role: true },
                take: 1,
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      },
    },
  })

  if (!worldCharacter) return null

  const worldRole = worldCharacter.world.memberships[0]?.role ?? null
  const canEditWorldIdentity = hasPlayableWorldCharacterAccess({
    userId,
    ownerId: worldCharacter.world.ownerId,
    worldRole,
    playableCampaignCount: worldCharacter.world.campaigns.length,
  })
  if (!canEditWorldIdentity) return null

  const availableCampaigns = await prisma.campaign.findMany({
    where: {
      worldId: worldCharacter.world.id,
      status: 'ACTIVE',
      campaignCharacters: { none: { worldCharacterId } },
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
    select: {
      id: true,
      name: true,
      ownerId: true,
      memberships: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
  })

  const profile = normalizeWorldCharacterProfile(worldCharacter.worldData)
  const portableIdentity = portableCharacterIdentity(
    worldCharacter.character.coreData,
  )
  if (!profile.values.whoIs && portableIdentity.description) {
    profile.values.whoIs = portableIdentity.description
  }

  return {
    id: worldCharacter.id,
    nameOverride: worldCharacter.nameOverride,
    displayName: worldCharacter.nameOverride ?? worldCharacter.character.name,
    status: worldCharacter.status,
    worldEntityId: worldCharacter.worldEntity?.id ?? null,
    character: {
      id: worldCharacter.character.id,
      name: worldCharacter.character.name,
      image: worldCharacter.character.image,
    },
    world: {
      id: worldCharacter.world.id,
      name: worldCharacter.world.name,
    },
    canEditWorldIdentity,
    hasCampaignParticipation: worldCharacter._count.campaignCharacters > 0,
    profile,
    customFields: normalizeWorldCharacterCustomFields(worldCharacter.worldData),
    recentCampaignId: worldCharacter.entryPreferences[0]?.campaignId ?? null,
    participations: worldCharacter.campaignCharacters.map((participation) => ({
      id: participation.id,
      status: participation.status,
      campaign: {
        id: participation.campaign.id,
        name: participation.campaign.name,
        status: participation.campaign.status,
        role: campaignRole({
          ownerId: participation.campaign.ownerId,
          userId,
          membershipRole: participation.campaign.memberships[0]?.role ?? null,
        }),
      },
    })),
    availableCampaigns: availableCampaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      role: campaignRole({
        ownerId: campaign.ownerId,
        userId,
        membershipRole: campaign.memberships[0]?.role ?? null,
      }) as WorldCharacterCampaignOption['role'],
    })),
  }
}
