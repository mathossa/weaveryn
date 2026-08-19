import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
import { characterService } from './character-service'

const ids: string[] = []
const emails: string[] = []

function id() {
  const value = randomUUID()
  ids.push(value)
  return value
}

async function createUser(label: string) {
  const email = `character-rejoin-${label}-${randomUUID()}@weaveryn.local`
  emails.push(email)
  return prisma.user.create({
    data: {
      id: id(),
      email,
      username: `character_rejoin_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      displayName: `Character Rejoin ${label}`,
    },
  })
}

describe('Character rejoin continuity', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await prisma.entityRelationship.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.character.deleteMany({ where: { id: { in: ids } } })
    await prisma.world.deleteMany({ where: { id: { in: ids } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    ids.length = 0
    emails.length = 0
  })

  it('adopts NPC description and custom fields when the same Character rejoins the World', async () => {
    const player = await createUser('player')
    const gm = await createUser('gm')
    const worldId = id()

    await prisma.world.create({
      data: { id: worldId, name: 'Continuity World', ownerId: gm.id },
    })
    await prisma.worldMembership.create({
      data: { id: id(), worldId, userId: player.id, role: 'MEMBER' },
    })

    const character = await characterService.createCharacter({
      ownerUserId: player.id,
      name: 'Marun',
    })
    ids.push(character.id)

    const firstWorldCharacter = await characterService.createWorldCharacter({
      actorUserId: player.id,
      characterId: character.id,
      worldId,
      worldData: {
        profile: {
          values: {
            whoIs: 'Marun before leaving the World.',
            personality: 'Quiet and observant.',
          },
          hiddenFields: [],
        },
        customFields: {
          Reputation: 2,
        },
      },
    })
    ids.push(firstWorldCharacter.id)

    const placeId = id()
    await prisma.worldEntity.create({
      data: {
        id: placeId,
        worldId,
        type: 'location',
        name: 'Old Harbor',
        createdById: gm.id,
      },
    })
    const relationshipId = id()
    await prisma.entityRelationship.create({
      data: {
        id: relationshipId,
        worldId,
        sourceEntityId: firstWorldCharacter.id,
        targetEntityId: placeId,
        relationshipType: 'KNOWS',
        createdById: gm.id,
      },
    })

    await characterService.deleteWorldCharacter(firstWorldCharacter.id, player.id)

    await prisma.worldEntity.update({
      where: { id: firstWorldCharacter.id },
      data: {
        description: 'Marun spent years working as a blacksmith after leaving.',
        data: {
          Personality: 'More guarded after years away.',
          'Former occupation': 'Blacksmith',
          Reputation: 5,
          Wanted: false,
        },
      },
    })

    const rejoinedWorldCharacter = await characterService.createWorldCharacter({
      actorUserId: player.id,
      characterId: character.id,
      worldId,
    })
    ids.push(rejoinedWorldCharacter.id)

    const persistedWorldCharacter = await prisma.worldCharacter.findUniqueOrThrow({
      where: { id: rejoinedWorldCharacter.id },
      select: { worldData: true },
    })
    expect(persistedWorldCharacter.worldData).toMatchObject({
      profile: {
        values: {
          whoIs: 'Marun spent years working as a blacksmith after leaving.',
          personality: 'More guarded after years away.',
        },
      },
      customFields: {
        'Former occupation': 'Blacksmith',
        Reputation: 5,
        Wanted: false,
      },
    })

    await expect(
      prisma.worldEntity.findUnique({
        where: { id: firstWorldCharacter.id },
        select: {
          worldCharacterId: true,
          type: true,
          description: true,
          data: true,
        },
      }),
    ).resolves.toEqual({
      worldCharacterId: rejoinedWorldCharacter.id,
      type: 'character',
      description: null,
      data: {},
    })

    await expect(
      prisma.entityRelationship.findUnique({
        where: { id: relationshipId },
        select: { sourceEntityId: true, targetEntityId: true },
      }),
    ).resolves.toEqual({
      sourceEntityId: firstWorldCharacter.id,
      targetEntityId: placeId,
    })
  })
})
