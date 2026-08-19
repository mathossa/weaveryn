import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { campaignCharacterService } from '@/server/campaign-characters'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
import { characterService } from './character-service'
import {
  getPortableCharacterOverview,
  getWorldCharacterOverview,
  listOwnedCharacterChoices,
} from './character-ui-service'

const ids: string[] = []
const emails: string[] = []

function id() {
  const value = randomUUID()
  ids.push(value)
  return value
}

async function createUser(label: string) {
  const email = `character-ui-${label}-${randomUUID()}@weaveryn.local`
  emails.push(email)
  return prisma.user.create({
    data: {
      id: id(),
      email,
      username: `character_ui_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      displayName: `Character UI ${label}`,
    },
  })
}

describe('Character UI flow', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await prisma.campaignCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaignMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.character.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaign.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldTimeline.deleteMany({ where: { id: { in: ids } } })
    await prisma.world.deleteMany({ where: { id: { in: ids } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    ids.length = 0
    emails.length = 0
  })

  it('lists the full Character chooser in stable alphabetical order', async () => {
    const player = await createUser('ordered-list')

    for (const name of ['Zara', 'Bodwick', 'Mira', 'Ada']) {
      const character = await characterService.createCharacter({
        ownerUserId: player.id,
        name,
      })
      ids.push(character.id)
    }

    const choices = await listOwnedCharacterChoices(player.id)
    expect(choices.map((choice) => choice.name)).toEqual([
      'Ada',
      'Bodwick',
      'Mira',
      'Zara',
    ])
  })

  it('lets an invited PLAYER create their own WorldCharacter and attach it to the Campaign', async () => {
    const player = await createUser('player')
    const gm = await createUser('gm')
    const worldId = id()
    const timelineId = id()
    const campaignId = id()

    await prisma.world.create({
      data: { id: worldId, name: 'Invited World', ownerId: gm.id },
    })
    await prisma.worldTimeline.create({
      data: { id: timelineId, worldId, name: 'Main' },
    })
    await prisma.campaign.create({
      data: {
        id: campaignId,
        name: 'Invited Campaign',
        worldId,
        ownerId: gm.id,
        timelineId,
        currentWorldPosition: '1',
        currentWorldDateLabel: 'Day 1',
      },
    })
    await prisma.campaignMembership.create({
      data: {
        id: id(),
        campaignId,
        userId: player.id,
        role: 'PLAYER',
      },
    })

    const character = await characterService.createCharacter({
      ownerUserId: player.id,
      name: 'Bodwick',
    })
    ids.push(character.id)

    const portable = await getPortableCharacterOverview(character.id, player.id)
    expect(portable?.availableWorlds).toEqual([
      expect.objectContaining({ id: worldId, name: 'Invited World' }),
    ])

    const worldCharacter = await characterService.createWorldCharacter({
      actorUserId: player.id,
      characterId: character.id,
      worldId,
    })
    ids.push(worldCharacter.id)

    const beforeJoin = await getWorldCharacterOverview(
      worldCharacter.id,
      player.id,
    )
    expect(beforeJoin).toMatchObject({
      canEditWorldIdentity: true,
      availableCampaigns: [
        { id: campaignId, name: 'Invited Campaign', role: 'PLAYER' },
      ],
      participations: [],
    })

    const participation =
      await campaignCharacterService.createCampaignCharacter({
        actorUserId: player.id,
        worldCharacterId: worldCharacter.id,
        campaignId,
      })
    ids.push(participation.id)

    const afterJoin = await getWorldCharacterOverview(
      worldCharacter.id,
      player.id,
    )
    expect(afterJoin).toMatchObject({
      availableCampaigns: [],
      participations: [
        {
          id: participation.id,
          campaign: {
            id: campaignId,
            name: 'Invited Campaign',
            role: 'PLAYER',
          },
        },
      ],
    })
  })

  it('removes an unused Character entity on World leave, preserves referenced history as an NPC, and reclaims it on rejoin', async () => {
    const player = await createUser('leave-world')
    const gm = await createUser('leave-world-gm')
    const worldId = id()

    await prisma.world.create({
      data: { id: worldId, name: 'Lifecycle World', ownerId: gm.id },
    })
    await prisma.worldMembership.create({
      data: { id: id(), worldId, userId: player.id, role: 'MEMBER' },
    })

    const unusedCharacter = await characterService.createCharacter({
      ownerUserId: player.id,
      name: 'Unused Hero',
    })
    ids.push(unusedCharacter.id)
    const unusedWorldCharacter = await characterService.createWorldCharacter({
      actorUserId: player.id,
      characterId: unusedCharacter.id,
      worldId,
    })
    ids.push(unusedWorldCharacter.id)

    await characterService.deleteWorldCharacter(
      unusedWorldCharacter.id,
      player.id,
    )

    await expect(
      prisma.worldEntity.findUnique({ where: { id: unusedWorldCharacter.id } }),
    ).resolves.toBeNull()

    const referencedCharacter = await characterService.createCharacter({
      ownerUserId: player.id,
      name: 'Remembered Hero',
    })
    ids.push(referencedCharacter.id)
    const referencedWorldCharacter =
      await characterService.createWorldCharacter({
        actorUserId: player.id,
        characterId: referencedCharacter.id,
        worldId,
      })
    ids.push(referencedWorldCharacter.id)

    const locationId = id()
    await prisma.worldEntity.create({
      data: {
        id: locationId,
        worldId,
        type: 'location',
        name: 'Old Keep',
        createdById: gm.id,
      },
    })
    const relationshipId = id()
    await prisma.entityRelationship.create({
      data: {
        id: relationshipId,
        worldId,
        sourceEntityId: referencedWorldCharacter.id,
        targetEntityId: locationId,
        relationshipType: 'VISITED',
        createdById: gm.id,
      },
    })

    await characterService.deleteWorldCharacter(
      referencedWorldCharacter.id,
      player.id,
    )

    await expect(
      prisma.worldEntity.findUnique({
        where: { id: referencedWorldCharacter.id },
        select: {
          type: true,
          worldCharacterId: true,
          originCharacterId: true,
          name: true,
        },
      }),
    ).resolves.toEqual({
      type: 'person',
      worldCharacterId: null,
      originCharacterId: referencedCharacter.id,
      name: 'Remembered Hero',
    })

    const rejoinedWorldCharacter = await characterService.createWorldCharacter({
      actorUserId: player.id,
      characterId: referencedCharacter.id,
      worldId,
    })
    ids.push(rejoinedWorldCharacter.id)

    expect(rejoinedWorldCharacter.id).not.toBe(referencedWorldCharacter.id)
    await expect(
      prisma.worldEntity.findMany({
        where: {
          worldId,
          originCharacterId: referencedCharacter.id,
        },
        select: {
          id: true,
          type: true,
          worldCharacterId: true,
          originCharacterId: true,
        },
      }),
    ).resolves.toEqual([
      {
        id: referencedWorldCharacter.id,
        type: 'character',
        worldCharacterId: rejoinedWorldCharacter.id,
        originCharacterId: referencedCharacter.id,
      },
    ])

    await expect(
      prisma.entityRelationship.findUnique({
        where: { id: relationshipId },
        select: { sourceEntityId: true, targetEntityId: true },
      }),
    ).resolves.toEqual({
      sourceEntityId: referencedWorldCharacter.id,
      targetEntityId: locationId,
    })
  })
})
