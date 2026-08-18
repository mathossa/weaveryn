import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
import { MAIN_WORLD_TIMELINE_NAME } from '@/server/worlds/world-timelines'
import {
  characterEntryKey,
  getWeaverResume,
  listEntryPreferences,
  recordCharacterEntryUse,
  recordWeaverEntryUse,
  setCharacterEntryPinned,
} from './entry-preferences'

const ids: string[] = []
const emails: string[] = []

function id() {
  const value = randomUUID()
  ids.push(value)
  return value
}

async function createUser(label: string) {
  const userId = id()
  const email = `entry-preference-${label}-${randomUUID()}@weaveryn.local`
  emails.push(email)
  return prisma.user.create({
    data: {
      id: userId,
      email,
      username: `entry_preference_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      displayName: `Entry Preference ${label}`,
    },
  })
}

describe('Choose Entity entry preferences integration', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await prisma.entryPreference.deleteMany({ where: { userId: { in: ids } } })
    await prisma.campaignCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaignMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaign.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldTimeline.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.character.deleteMany({ where: { id: { in: ids } } })
    await prisma.world.deleteMany({ where: { id: { in: ids } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    ids.length = 0
    emails.length = 0
  })

  it('persists pin, recent-use, and Weaver resume state only for authorized entries', async () => {
    const actor = await createUser('actor')
    const outsider = await createUser('outsider')

    const worldId = id()
    const hiddenWorldId = id()
    await prisma.world.createMany({
      data: [
        { id: worldId, name: 'Entry World', ownerId: actor.id },
        { id: hiddenWorldId, name: 'Hidden World', ownerId: outsider.id },
      ],
    })

    const timelineId = id()
    await prisma.worldTimeline.create({
      data: {
        id: timelineId,
        worldId,
        name: MAIN_WORLD_TIMELINE_NAME,
      },
    })

    const characterId = id()
    const worldCharacterId = id()
    await prisma.character.create({
      data: {
        id: characterId,
        ownerUserId: actor.id,
        name: 'Bodwick',
      },
    })
    await prisma.worldCharacter.create({
      data: {
        id: worldCharacterId,
        characterId,
        worldId,
      },
    })

    const campaignId = id()
    const hiddenCampaignId = id()
    await prisma.campaign.createMany({
      data: [
        {
          id: campaignId,
          name: 'Managed Campaign',
          worldId,
          ownerId: actor.id,
          timelineId,
          currentWorldPosition: '1',
          currentWorldDateLabel: 'Day 1',
        },
        {
          id: hiddenCampaignId,
          name: 'Hidden Campaign',
          worldId,
          ownerId: outsider.id,
          timelineId,
          currentWorldPosition: '2',
          currentWorldDateLabel: 'Day 2',
        },
      ],
    })
    await prisma.campaignCharacter.createMany({
      data: [
        {
          id: id(),
          worldCharacterId,
          campaignId,
        },
        {
          id: id(),
          worldCharacterId,
          campaignId: hiddenCampaignId,
        },
      ],
    })

    await setCharacterEntryPinned({
      userId: actor.id,
      worldCharacterId,
      campaignId,
      pinned: true,
    })
    await recordCharacterEntryUse({
      userId: actor.id,
      worldCharacterId,
      campaignId,
    })
    await recordWeaverEntryUse({
      userId: actor.id,
      worldId,
      campaignId,
    })

    expect(await listEntryPreferences(actor.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entryKey: characterEntryKey(worldCharacterId, campaignId),
          pinned: true,
          worldCharacterId,
          campaignId,
          lastUsedAt: expect.any(Date),
        }),
        expect.objectContaining({
          entryKey: 'weaver',
          worldId,
          campaignId,
          lastUsedAt: expect.any(Date),
        }),
      ]),
    )
    expect(await getWeaverResume(actor.id)).toMatchObject({
      world: { id: worldId, name: 'Entry World' },
      campaign: { id: campaignId, name: 'Managed Campaign' },
      lastUsedAt: expect.any(Date),
    })

    await expect(
      setCharacterEntryPinned({
        userId: actor.id,
        worldCharacterId,
        campaignId: hiddenCampaignId,
        pinned: true,
      }),
    ).rejects.toMatchObject({
      code: 'ENTRY_PREFERENCE_NOT_AVAILABLE',
    })
    await expect(
      recordWeaverEntryUse({
        userId: actor.id,
        worldId: hiddenWorldId,
      }),
    ).rejects.toMatchObject({
      code: 'ENTRY_PREFERENCE_NOT_AVAILABLE',
    })
  })
})
