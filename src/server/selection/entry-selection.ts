import { prisma } from '@/lib/prisma'

export interface EntryCampaignChoice {
  id: string
  name: string
}

export interface EntryWorldCharacterChoice {
  id: string
  characterId: string
  name: string
  image: string | null
  worldId: string
  worldName: string
  createdAt: Date
  campaigns: EntryCampaignChoice[]
}

export interface EntryPortableCharacterChoice {
  id: string
  name: string
  image: string | null
  createdAt: Date
}

export interface EntryCampaignMembershipChoice {
  id: string
  name: string
  role: 'PLAYER' | 'SPECTATOR'
  worldId: string
  worldName: string
}

export interface WeaverWorldChoice {
  id: string
  name: string
}

export interface EntrySelection {
  characters: EntryWorldCharacterChoice[]
  portableCharacters: EntryPortableCharacterChoice[]
  campaignMemberships: EntryCampaignMembershipChoice[]
  weaverWorlds: WeaverWorldChoice[]
}

export async function getEntrySelection(
  userId: string,
): Promise<EntrySelection> {
  const [
    worldCharacters,
    portableCharacters,
    campaignMemberships,
    weaverWorlds,
  ] = await Promise.all([
    prisma.worldCharacter.findMany({
      where: {
        status: 'ACTIVE',
        character: {
          ownerUserId: userId,
          status: 'ACTIVE',
        },
        world: {
          OR: [
            { ownerId: userId },
            { memberships: { some: { userId } } },
            {
              campaigns: {
                some: {
                  OR: [
                    { ownerId: userId },
                    { memberships: { some: { userId } } },
                  ],
                },
              },
            },
          ],
        },
      },
      select: {
        id: true,
        characterId: true,
        nameOverride: true,
        createdAt: true,
        character: {
          select: {
            name: true,
            image: true,
          },
        },
        world: {
          select: {
            id: true,
            name: true,
          },
        },
        campaignCharacters: {
          where: {
            status: 'ACTIVE',
            campaign: {
              status: 'ACTIVE',
              OR: [
                { ownerId: userId },
                { memberships: { some: { userId } } },
              ],
            },
          },
          select: {
            campaign: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
    prisma.character.findMany({
      where: {
        ownerUserId: userId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
    prisma.campaignMembership.findMany({
      where: {
        userId,
        role: { in: ['PLAYER', 'SPECTATOR'] },
        campaign: { status: 'ACTIVE', worldId: { not: null } },
      },
      select: {
        role: true,
        campaign: {
          select: {
            id: true,
            name: true,
            world: { select: { id: true, name: true } },
            campaignCharacters: {
              where: {
                status: 'ACTIVE',
                worldCharacter: { character: { ownerUserId: userId } },
              },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    }),
    prisma.world.findMany({
      where: {
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
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    }),
  ])

  const selectedCharacterIds = new Set(
    worldCharacters.map((worldCharacter) => worldCharacter.characterId),
  )

  return {
    characters: worldCharacters.map((worldCharacter) => ({
      id: worldCharacter.id,
      characterId: worldCharacter.characterId,
      name: worldCharacter.nameOverride ?? worldCharacter.character.name,
      image: worldCharacter.character.image,
      worldId: worldCharacter.world.id,
      worldName: worldCharacter.world.name,
      createdAt: worldCharacter.createdAt,
      campaigns: worldCharacter.campaignCharacters.map(
        ({ campaign }) => campaign,
      ),
    })),
    portableCharacters: portableCharacters.filter(
      (character) => !selectedCharacterIds.has(character.id),
    ),
    campaignMemberships: campaignMemberships.flatMap((membership) => {
      if (membership.role !== 'PLAYER' && membership.role !== 'SPECTATOR') {
        return []
      }
      const campaign = membership.campaign
      if (!campaign.world) return []
      if (
        membership.role === 'PLAYER' &&
        campaign.campaignCharacters.length > 0
      ) {
        return []
      }
      return [
        {
          id: campaign.id,
          name: campaign.name,
          role: membership.role,
          worldId: campaign.world.id,
          worldName: campaign.world.name,
        },
      ]
    }),
    weaverWorlds,
  }
}
