import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { assertSafeDevEnvironment } from '@/server/dev-scenarios/environment'
import {
  cleanupOrphanedWorld,
  relinquishWorldOwnership,
} from '@/server/worlds/world-orphan-lifecycle-service'
import { campaignCharacterService } from '../campaign-characters/campaign-character-service'
import { campaignMembershipService } from './campaign-membership-service'
import { campaignService } from './campaign-service'

const ids: string[] = []
const emails: string[] = []

function id() {
  const value = randomUUID()
  ids.push(value)
  return value
}

async function createUser(label: string) {
  const email = `campaign-lifecycle-${label}-${randomUUID()}@weaveryn.local`
  emails.push(email)
  return prisma.user.create({
    data: {
      id: id(),
      email,
      username: `campaign_lifecycle_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      displayName: `Campaign Lifecycle ${label}`,
    },
  })
}

async function createWorld(ownerId: string, label: string) {
  const worldId = id()
  const timelineId = id()
  await prisma.world.create({
    data: {
      id: worldId,
      name: `${label} World`,
      description: `${label} World description`,
      ownerId,
    },
  })
  await prisma.worldTimeline.create({
    data: { id: timelineId, worldId, name: 'Main' },
  })
  return { worldId, timelineId }
}

async function createCampaign(
  ownerId: string,
  worldId: string,
  name = 'Lifecycle Campaign',
) {
  const campaign = await campaignService.createCampaign({
    creatorId: ownerId,
    worldId,
    name,
    description: 'A Campaign lifecycle integration fixture.',
    currentWorldPosition: '142.5',
    currentWorldDateLabel: '14 Emberwane, 812',
  })
  ids.push(campaign.id)
  const membership = await prisma.campaignMembership.findUniqueOrThrow({
    where: { campaignId_userId: { campaignId: campaign.id, userId: ownerId } },
  })
  ids.push(membership.id)
  return campaign
}

async function addCampaignMember(
  actorUserId: string,
  campaignId: string,
  userId: string,
  role: 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR',
) {
  const membership = await campaignMembershipService.addMember({
    actorUserId,
    campaignId,
    userId,
    role,
  })
  ids.push(membership.id)
  return membership
}

async function createCharacterParticipation(
  ownerUserId: string,
  worldId: string,
  campaignId: string,
) {
  const characterId = id()
  const worldCharacterId = id()
  await prisma.character.create({
    data: { id: characterId, ownerUserId, name: 'Marun' },
  })
  await prisma.worldCharacter.create({
    data: { id: worldCharacterId, characterId, worldId },
  })
  const campaignCharacter =
    await campaignCharacterService.createCampaignCharacter({
      actorUserId: ownerUserId,
      worldCharacterId,
      campaignId,
      sheetData: { gold: 12 },
    })
  ids.push(campaignCharacter.id)
  return {
    characterId,
    worldCharacterId,
    campaignCharacterId: campaignCharacter.id,
  }
}

describe('Campaign ownership and lifecycle persistence', () => {
  beforeAll(() => {
    assertSafeDevEnvironment()
  })

  afterEach(async () => {
    await prisma.membershipInvitation.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaignCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.entryPreference.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaignMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.campaign.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldEntity.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldCharacter.deleteMany({ where: { id: { in: ids } } })
    await prisma.character.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldMembership.deleteMany({ where: { id: { in: ids } } })
    await prisma.worldTimeline.deleteMany({ where: { id: { in: ids } } })
    await prisma.world.deleteMany({ where: { id: { in: ids } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    ids.length = 0
    emails.length = 0
  })

  it('transfers ownership atomically while normalizing every target to GM', async () => {
    const worldOwner = await createUser('world-owner')
    const initialOwner = await createUser('initial-owner')
    const player = await createUser('player')
    const assistant = await createUser('assistant')
    const nonMember = await createUser('non-member')
    const { worldId } = await createWorld(worldOwner.id, 'Transfer')
    await prisma.worldMembership.create({
      data: { id: id(), worldId, userId: initialOwner.id, role: 'ADMIN' },
    })
    const campaign = await createCampaign(initialOwner.id, worldId)
    await addCampaignMember(initialOwner.id, campaign.id, player.id, 'PLAYER')
    await addCampaignMember(
      initialOwner.id,
      campaign.id,
      assistant.id,
      'ASSISTANT_GM',
    )

    await expect(
      campaignService.transferOwnership({
        campaignId: campaign.id,
        worldId,
        actorUserId: worldOwner.id,
        targetUserId: player.id,
      }),
    ).rejects.toMatchObject({
      code: 'CAMPAIGN_OWNERSHIP_TRANSFER_FORBIDDEN',
    })

    await campaignService.transferOwnership({
      campaignId: campaign.id,
      worldId,
      actorUserId: initialOwner.id,
      targetUserId: player.id,
    })
    await campaignService.transferOwnership({
      campaignId: campaign.id,
      worldId,
      actorUserId: player.id,
      targetUserId: assistant.id,
    })
    await campaignService.transferOwnership({
      campaignId: campaign.id,
      worldId,
      actorUserId: assistant.id,
      targetUserId: nonMember.id,
    })

    const persisted = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
      include: { memberships: { orderBy: { userId: 'asc' } } },
    })
    expect(persisted.ownerId).toBe(nonMember.id)
    expect(
      persisted.memberships
        .filter((membership) =>
          [initialOwner.id, player.id, assistant.id, nonMember.id].includes(
            membership.userId,
          ),
        )
        .map((membership) => membership.role),
    ).toEqual(['GM', 'GM', 'GM', 'GM'])
    expect(
      persisted.memberships.find(
        (membership) => membership.userId === nonMember.id,
      )?.capabilities,
    ).toEqual([])
  })

  it('blocks active and ended Campaigns from orphaned World cleanup', async () => {
    const owner = await createUser('cleanup-block-owner')
    const { worldId } = await createWorld(owner.id, 'Cleanup Block')
    const campaign = await createCampaign(owner.id, worldId)
    await relinquishWorldOwnership({ worldId, ownerId: owner.id })

    await expect(cleanupOrphanedWorld(worldId)).rejects.toMatchObject({
      code: 'ORPHANED_WORLD_CLEANUP_BLOCKED_BY_ACTIVE_CAMPAIGNS',
    })

    await campaignService.endCampaign({
      campaignId: campaign.id,
      worldId,
      actorUserId: owner.id,
    })
    await expect(cleanupOrphanedWorld(worldId)).rejects.toMatchObject({
      code: 'ORPHANED_WORLD_CLEANUP_BLOCKED_BY_ENDED_CAMPAIGNS',
    })
    await expect(
      prisma.world.findUnique({ where: { id: worldId } }),
    ).resolves.not.toBeNull()
  })

  it('snapshots and detaches an archived Campaign when its orphaned World is deleted', async () => {
    const owner = await createUser('archived-owner')
    const { worldId } = await createWorld(owner.id, 'Archived')
    const locationId = id()
    await prisma.worldEntity.create({
      data: {
        id: locationId,
        worldId,
        type: 'location',
        name: 'Highwatch',
        createdById: owner.id,
      },
    })
    const campaign = await createCampaign(
      owner.id,
      worldId,
      'Archived Chronicle',
    )
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { currentLocationId: locationId },
    })
    const participation = await createCharacterParticipation(
      owner.id,
      worldId,
      campaign.id,
    )

    await campaignService.endCampaign({
      campaignId: campaign.id,
      worldId,
      actorUserId: owner.id,
    })
    await campaignService.archiveCampaign({
      campaignId: campaign.id,
      worldId,
      actorUserId: owner.id,
    })
    await expect(
      prisma.campaignCharacter.findUnique({
        where: { id: participation.campaignCharacterId },
      }),
    ).resolves.not.toBeNull()

    await relinquishWorldOwnership({ worldId, ownerId: owner.id })
    await cleanupOrphanedWorld(worldId)

    const archived = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
    })
    expect(archived).toMatchObject({
      status: 'ARCHIVED',
      worldId: null,
      timelineId: null,
      currentLocationId: null,
      archivedWorldSnapshot: {
        version: 1,
        world: {
          id: worldId,
          name: 'Archived World',
          description: 'Archived World description',
        },
        finalContext: {
          worldPosition: '142.5',
          worldDateLabel: '14 Emberwane, 812',
          location: { id: locationId, name: 'Highwatch' },
        },
      },
    })
    await expect(
      campaignService.loadCampaign(campaign.id, owner.id),
    ).resolves.toMatchObject({
      id: campaign.id,
      status: 'ARCHIVED',
      worldId: null,
    })
    await expect(
      prisma.world.findUnique({ where: { id: worldId } }),
    ).resolves.toBeNull()
    await expect(
      prisma.character.findUnique({ where: { id: participation.characterId } }),
    ).resolves.not.toBeNull()
  })

  it('deletes only Campaign-scoped state and preserves portable identities', async () => {
    const owner = await createUser('delete-owner')
    const { worldId } = await createWorld(owner.id, 'Delete')
    const campaign = await createCampaign(
      owner.id,
      worldId,
      'Disposable Campaign',
    )
    const participation = await createCharacterParticipation(
      owner.id,
      worldId,
      campaign.id,
    )
    const worldEntityId = id()
    await prisma.worldEntity.create({
      data: {
        id: worldEntityId,
        worldId,
        worldCharacterId: participation.worldCharacterId,
        worldCharacterWorldId: worldId,
        originCharacterId: participation.characterId,
        type: 'character',
        name: 'Marun',
        createdById: owner.id,
        visibilityScope: 'CAMPAIGN',
        visibilityCampaignId: campaign.id,
      },
    })

    await campaignService.deleteCampaign({
      campaignId: campaign.id,
      worldId,
      actorUserId: owner.id,
    })

    await expect(
      prisma.campaign.findUnique({ where: { id: campaign.id } }),
    ).resolves.toBeNull()
    await expect(
      prisma.campaignCharacter.findUnique({
        where: { id: participation.campaignCharacterId },
      }),
    ).resolves.toBeNull()
    await expect(
      prisma.world.findUnique({ where: { id: worldId } }),
    ).resolves.not.toBeNull()
    await expect(
      prisma.character.findUnique({ where: { id: participation.characterId } }),
    ).resolves.not.toBeNull()
    await expect(
      prisma.worldCharacter.findUnique({
        where: { id: participation.worldCharacterId },
      }),
    ).resolves.not.toBeNull()
    await expect(
      prisma.worldEntity.findUnique({ where: { id: worldEntityId } }),
    ).resolves.toMatchObject({ id: worldEntityId, visibilityCampaignId: null })
  })
})
