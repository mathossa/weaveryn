import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
import { MAIN_WORLD_TIMELINE_NAME } from '@/server/worlds/world-timelines'
import { getEntrySelection } from './entry-selection'

const ids: string[] = []
const emails: string[] = []

function id() {
  const value = randomUUID()
  ids.push(value)
  return value
}

async function createUser(label: string) {
  const userId = id()
  const email = `selection-${label}-${randomUUID()}@weaveryn.local`
  emails.push(email)
  return prisma.user.create({
    data: {
      id: userId,
      email,
      username: `selection_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      displayName: `Selection ${label}`,
    },
  })
}

describe('Choose Entity integration', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
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

  it('returns authorized WorldCharacters, portable Characters, Campaign choices, and Weaver Worlds', async () => {
    const actor = await createUser('actor')
    const outsider = await createUser('outsider')

    const ownedWorldId = id()
    const memberWorldId = id()
    const hiddenWorldId = id()
    await prisma.world.createMany({
      data: [
        { id: ownedWorldId, name: 'Owned World', ownerId: actor.id },
        { id: memberWorldId, name: 'Member World', ownerId: outsider.id },
        { id: hiddenWorldId, name: 'Hidden World', ownerId: outsider.id },
      ],
    })
    await prisma.worldMembership.create({
      data: {
        id: id(),
        worldId: memberWorldId,
        userId: actor.id,
        role: 'MEMBER',
      },
    })

    const characterId = id()
    const portableCharacterId = id()
    await prisma.character.createMany({
      data: [
        {
          id: characterId,
          ownerUserId: actor.id,
          name: 'Bodwick',
          createdAt: new Date('2026-08-14T12:00:00Z'),
        },
        {
          id: portableCharacterId,
          ownerUserId: actor.id,
          name: 'Mira',
          createdAt: new Date('2026-08-17T12:00:00Z'),
        },
      ],
    })

    const olderWorldCharacterId = id()
    const newerWorldCharacterId = id()
    const hiddenWorldCharacterId = id()
    await prisma.worldCharacter.createMany({
      data: [
        {
          id: olderWorldCharacterId,
          characterId,
          worldId: ownedWorldId,
          createdAt: new Date('2026-08-15T12:00:00Z'),
        },
        {
          id: newerWorldCharacterId,
          characterId,
          worldId: memberWorldId,
          nameOverride: 'Bodwick of Member World',
          createdAt: new Date('2026-08-16T12:00:00Z'),
        },
        {
          id: hiddenWorldCharacterId,
          characterId,
          worldId: hiddenWorldId,
          createdAt: new Date('2026-08-18T12:00:00Z'),
        },
      ],
    })

    const ownedTimelineId = id()
    await prisma.worldTimeline.create({
      data: {
        id: ownedTimelineId,
        worldId: ownedWorldId,
        name: MAIN_WORLD_TIMELINE_NAME,
      },
    })

    const accessibleCampaignId = id()
    const hiddenCampaignId = id()
    await prisma.campaign.createMany({
      data: [
        {
          id: accessibleCampaignId,
          name: 'Accessible Campaign',
          worldId: ownedWorldId,
          ownerId: outsider.id,
          timelineId: ownedTimelineId,
          currentWorldPosition: '1',
          currentWorldDateLabel: 'Day 1',
        },
        {
          id: hiddenCampaignId,
          name: 'Hidden Campaign',
          worldId: ownedWorldId,
          ownerId: outsider.id,
          timelineId: ownedTimelineId,
          currentWorldPosition: '2',
          currentWorldDateLabel: 'Day 2',
        },
      ],
    })
    await prisma.campaignMembership.create({
      data: {
        id: id(),
        campaignId: accessibleCampaignId,
        userId: actor.id,
        role: 'PLAYER',
      },
    })
    await prisma.campaignCharacter.createMany({
      data: [
        {
          id: id(),
          worldCharacterId: olderWorldCharacterId,
          campaignId: accessibleCampaignId,
        },
        {
          id: id(),
          worldCharacterId: olderWorldCharacterId,
          campaignId: hiddenCampaignId,
        },
      ],
    })

    const selection = await getEntrySelection(actor.id)

    expect(selection.characters.map(({ id }) => id)).toEqual([
      newerWorldCharacterId,
      olderWorldCharacterId,
    ])
    expect(selection.characters[0]).toMatchObject({
      name: 'Bodwick of Member World',
      worldName: 'Member World',
      campaigns: [],
    })
    expect(selection.characters[1].campaigns).toEqual([
      {
        id: accessibleCampaignId,
        name: 'Accessible Campaign',
        currentWorldDateLabel: 'Day 1',
        memberCount: 1,
      },
    ])
    expect(selection.portableCharacters).toEqual([
      expect.objectContaining({ id: portableCharacterId, name: 'Mira' }),
    ])
    expect(selection.weaverWorlds).toEqual([
      { id: ownedWorldId, name: 'Owned World' },
    ])
  })
})
