import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
import { campaignMembershipService } from './campaign-membership-service'
import { campaignService } from './campaign-service'
import {
  getCampaignOverview,
  getWorldCampaignSelection,
} from './campaign-ui-service'

const ids: string[] = []
const emails: string[] = []

function id() {
  const value = randomUUID()
  ids.push(value)
  return value
}

async function createUser(label: string) {
  const email = `campaign-ui-${label}-${randomUUID()}@weaveryn.local`
  emails.push(email)
  return prisma.user.create({
    data: {
      id: id(),
      email,
      username: `campaign_ui_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      displayName: `Campaign UI ${label}`,
    },
  })
}

describe('Campaign UI projections', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await prisma.campaignCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaignMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaign.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldTimeline.deleteMany({ where: { id: { in: ids } } })
    await prisma.world.deleteMany({ where: { id: { in: ids } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    ids.length = 0
    emails.length = 0
  })

  it('keeps World authority separate from Campaign access and exposes role capabilities', async () => {
    const worldOwner = await createUser('world-owner')
    const campaignOwner = await createUser('campaign-owner')
    const gm = await createUser('gm')
    const player = await createUser('player')
    const worldId = id()
    const timelineId = id()

    await prisma.world.create({
      data: { id: worldId, name: 'Aldorath', ownerId: worldOwner.id },
    })
    await prisma.worldTimeline.create({
      data: { id: timelineId, worldId, name: 'Main' },
    })
    await prisma.worldMembership.create({
      data: {
        id: id(),
        worldId,
        userId: campaignOwner.id,
        role: 'ADMIN',
      },
    })

    const campaign = await campaignService.createCampaign({
      creatorId: campaignOwner.id,
      worldId,
      name: 'Ashes of Aldorath',
      description: 'A campaign at the edge of an empire.',
      currentWorldPosition: '142.5',
      currentWorldDateLabel: '14 Emberwane, 812',
    })
    ids.push(campaign.id)

    const ownerMembership = await prisma.campaignMembership.findUniqueOrThrow({
      where: {
        campaignId_userId: {
          campaignId: campaign.id,
          userId: campaignOwner.id,
        },
      },
    })
    ids.push(ownerMembership.id)

    const gmMembership = await campaignMembershipService.addMember({
      actorUserId: campaignOwner.id,
      campaignId: campaign.id,
      userId: gm.id,
      role: 'GM',
    })
    ids.push(gmMembership.id)

    const playerMembership = await campaignMembershipService.addMember({
      actorUserId: campaignOwner.id,
      campaignId: campaign.id,
      userId: player.id,
      role: 'PLAYER',
    })
    ids.push(playerMembership.id)

    const worldOwnerSelection = await getWorldCampaignSelection(
      worldId,
      worldOwner.id,
    )
    expect(worldOwnerSelection).toMatchObject({
      canCreateCampaign: true,
      campaigns: [],
    })

    const playerSelection = await getWorldCampaignSelection(worldId, player.id)
    expect(playerSelection).toMatchObject({
      canCreateCampaign: false,
      campaigns: [
        {
          id: campaign.id,
          name: 'Ashes of Aldorath',
          role: 'PLAYER',
          isOwner: false,
          status: 'ACTIVE',
        },
      ],
    })

    const ownerOverview = await getCampaignOverview(
      worldId,
      campaign.id,
      campaignOwner.id,
    )
    expect(ownerOverview).toMatchObject({
      isOwner: true,
      role: 'GM',
      canEditName: true,
      canEditSharedInfo: true,
      canManageMembers: true,
      canTransferOwnership: true,
      canEnd: true,
      canArchive: false,
      canDelete: true,
    })

    const gmOverview = await getCampaignOverview(worldId, campaign.id, gm.id)
    expect(gmOverview).toMatchObject({
      isOwner: false,
      role: 'GM',
      canEditName: false,
      canEditSharedInfo: true,
      canManageMembers: false,
      canTransferOwnership: false,
      canEnd: false,
      canArchive: false,
      canDelete: false,
    })

    const playerOverview = await getCampaignOverview(
      worldId,
      campaign.id,
      player.id,
    )
    expect(playerOverview).toMatchObject({
      isOwner: false,
      role: 'PLAYER',
      canEditName: false,
      canEditSharedInfo: false,
      canManageMembers: false,
    })

    await campaignService.endCampaign({
      campaignId: campaign.id,
      worldId,
      actorUserId: campaignOwner.id,
    })
    await expect(
      getCampaignOverview(worldId, campaign.id, campaignOwner.id),
    ).resolves.toMatchObject({
      status: 'ENDED',
      canEditName: true,
      canEditSharedInfo: true,
      canManageMembers: true,
      canTransferOwnership: true,
      canEnd: false,
      canArchive: true,
      canDelete: true,
    })

    await campaignService.archiveCampaign({
      campaignId: campaign.id,
      worldId,
      actorUserId: campaignOwner.id,
    })
    await expect(
      getCampaignOverview(worldId, campaign.id, campaignOwner.id),
    ).resolves.toMatchObject({
      status: 'ARCHIVED',
      canEditName: false,
      canEditSharedInfo: false,
      canManageMembers: false,
      canTransferOwnership: false,
      canEnd: false,
      canArchive: false,
      canDelete: true,
      canUpdateCurrentLocation: false,
    })
    await expect(
      getCampaignOverview(worldId, campaign.id, gm.id),
    ).resolves.toMatchObject({
      status: 'ARCHIVED',
      canEditName: false,
      canEditSharedInfo: false,
      canManageMembers: false,
      canTransferOwnership: false,
      canEnd: false,
      canArchive: false,
      canDelete: false,
      canUpdateCurrentLocation: false,
    })
  })
})
