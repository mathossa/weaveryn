import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
import { getEntrySelection } from '@/server/selection'
import {
  characterService,
  getPortableCharacterOverview,
  getWorldCharacterOverview,
} from './index'

const ids: string[] = []
const emails: string[] = []

function id() {
  const value = randomUUID()
  ids.push(value)
  return value
}

async function createUser(label: string) {
  const userId = id()
  const email = `character-spectator-${label}-${randomUUID()}@weaveryn.local`
  emails.push(email)
  return prisma.user.create({
    data: {
      id: userId,
      email,
      username: `character_spectator_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      displayName: `Character spectator ${label}`,
    },
  })
}

describe('Spectator-only Character access', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await prisma.worldEntity.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaignCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaignMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.character.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaign.deleteMany({ where: { id: { in: ids } } })
    await prisma.world.deleteMany({ where: { id: { in: ids } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    ids.length = 0
    emails.length = 0
  })

  it('does not let a Spectator create or open a playable WorldCharacter', async () => {
    const actor = await createUser('actor')
    const owner = await createUser('owner')
    const worldId = id()
    const campaignId = id()
    const characterId = id()
    const staleWorldCharacterId = id()

    await prisma.world.create({
      data: { id: worldId, name: 'Witness World', ownerId: owner.id },
    })
    await prisma.campaign.create({
      data: {
        id: campaignId,
        name: 'Witness Campaign',
        worldId,
        ownerId: owner.id,
      },
    })
    await prisma.campaignMembership.create({
      data: {
        id: id(),
        campaignId,
        userId: actor.id,
        role: 'SPECTATOR',
      },
    })
    await prisma.character.create({
      data: {
        id: characterId,
        ownerUserId: actor.id,
        name: 'Mift',
      },
    })

    await expect(
      characterService.createWorldCharacter({
        actorUserId: actor.id,
        characterId,
        worldId,
      }),
    ).rejects.toMatchObject({ code: 'WORLD_PERMISSION_DENIED' })

    // Simulate legacy data created before Spectator access was tightened.
    await prisma.worldCharacter.create({
      data: {
        id: staleWorldCharacterId,
        characterId,
        worldId,
      },
    })

    const portable = await getPortableCharacterOverview(characterId, actor.id)
    expect(portable?.worldCharacters).toEqual([])
    expect(portable?.unavailableWorldCharacters).toEqual([
      expect.objectContaining({
        id: staleWorldCharacterId,
        world: { id: worldId, name: 'Witness World' },
      }),
    ])
    expect(portable?.availableWorlds).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: worldId })]),
    )

    await expect(
      getWorldCharacterOverview(staleWorldCharacterId, actor.id),
    ).resolves.toBeNull()

    const selection = await getEntrySelection(actor.id)
    expect(selection.characters).toEqual([])
    expect(selection.portableCharacters).toEqual([
      expect.objectContaining({ id: characterId, name: 'Mift' }),
    ])
    expect(selection.campaignMemberships).toEqual([
      expect.objectContaining({
        id: campaignId,
        role: 'SPECTATOR',
        worldId,
      }),
    ])
  })
})
