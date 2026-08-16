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

export interface WeaverWorldChoice {
  id: string
  name: string
}

export interface EntrySelection {
  characters: EntryWorldCharacterChoice[]
  weaverWorlds: WeaverWorldChoice[]
}

export async function getEntrySelection(
  userId: string,
): Promise<EntrySelection> {
  const [worldCharacters, weaverWorlds] = await Promise.all([
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
              OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
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
    weaverWorlds,
  }
}
