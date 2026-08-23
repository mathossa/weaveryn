import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
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
  const email = `selection-membership-${label}-${randomUUID()}@weaveryn.local`
  emails.push(email)
  return prisma.user.create({
    data: {
      id: userId,
      email,
      username: `selection_membership_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      displayName: `Selection membership ${label}`,
    },
  })
}

describe('Campaign membership Choose Entity entries', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await prisma.campaignCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaignMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.character.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaign.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldTimeline.deleteMany({ where: { id: { in: ids } } })
    await prisma.world.deleteMany({ where: { id: { in: ids } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    ids.length = 0
    emails.length = 0
  })

  it('shows Spectator and unattached Player memberships but omits an attached Player membership', async () => {
    const actor = await createUser('actor')
    const owner = await createUser('owner')
    const worldId = id()
    const timelineId = id()
    await prisma.world.create({
      data: { id: worldId, name: 'Membership World', ownerId: owner.id },
    })
    await prisma.worldTimeline.create({
      data: { id: timelineId, worldId, name: 'Main' },
    })

    const spectatorCampaignId = id()
    const unattachedCampaignId = id()
    const attachedCampaignId = id()
    await prisma.campaign.createMany({
      data: [
        {
          id: spectatorCampaignId,
          name: 'Spectator Campaign',
          worldId,
          ownerId: owner.id,
          timelineId,
          currentWorldPosition: '1',
          currentWorldDateLabel: 'Day 1',
        },
        {
          id: unattachedCampaignId,
          name: 'Unattached Player Campaign',
          worldId,
          ownerId: owner.id,
          timelineId,
          currentWorldPosition: '2',
          currentWorldDateLabel: 'Day 2',
        },
        {
          id: attachedCampaignId,
          name: 'Attached Player Campaign',
          worldId,
          ownerId: owner.id,
          timelineId,
          currentWorldPosition: '3',
          currentWorldDateLabel: 'Day 3',
        },
      ],
    })

    await prisma.campaignMembership.createMany({
      data: [
        {
          id: id(),
          campaignId: spectatorCampaignId,
          userId: actor.id,
          role: 'SPECTATOR',
        },
        {
          id: id(),
          campaignId: unattachedCampaignId,
          userId: actor.id,
          role: 'PLAYER',
        },
        {
          id: id(),
          campaignId: attachedCampaignId,
          userId: actor.id,
          role: 'PLAYER',
        },
      ],
    })

    const characterId = id()
    const worldCharacterId = id()
    await prisma.character.create({
      data: {
        id: characterId,
        ownerUserId: actor.id,
        name: 'Attached Character',
      },
    })
    await prisma.worldCharacter.create({
      data: {
        id: worldCharacterId,
        characterId,
        worldId,
      },
    })
    await prisma.campaignCharacter.create({
      data: {
        id: id(),
        campaignId: attachedCampaignId,
        worldCharacterId,
      },
    })

    const selection = await getEntrySelection(actor.id)

    expect(selection.campaignMemberships).toEqual(
      expect.arrayContaining([
        {
          id: spectatorCampaignId,
          name: 'Spectator Campaign',
          role: 'SPECTATOR',
          worldId,
          worldName: 'Membership World',
        },
        {
          id: unattachedCampaignId,
          name: 'Unattached Player Campaign',
          role: 'PLAYER',
          worldId,
          worldName: 'Membership World',
        },
      ]),
    )
    expect(
      selection.campaignMemberships.some(
        (campaign) => campaign.id === attachedCampaignId,
      ),
    ).toBe(false)
    expect(selection.characters).toEqual([
      expect.objectContaining({
        id: worldCharacterId,
        campaigns: [
          {
            id: attachedCampaignId,
            name: 'Attached Player Campaign',
            currentWorldDateLabel: 'Day 3',
            memberCount: 1,
          },
        ],
      }),
    ])
  })
})
