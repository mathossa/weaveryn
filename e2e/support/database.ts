import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import type { E2EEnvironment, E2EFixture } from './environment'

export interface BackboneIds {
  ownerUserId: string
  primaryWorldId: string
  secondaryWorldId: string
  primaryCampaignId: string
  memberCampaignId: string
  secondaryCampaignId: string
  archivedCampaignId: string
  characterId: string
  primaryWorldCharacterId: string
  secondaryWorldCharacterId: string
  primaryCampaignCharacterId: string
  secondaryCampaignCharacterId: string
  locationEntityId: string
  organizationEntityId: string
  relationshipId: string
  worldEventId: string
}

export interface CleanupReport {
  campaigns: number
  worlds: number
  characters: number
  users: number
  retained: string[]
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`E2E fixture ownership violation: ${message}`)
}

export function createE2EPrismaClient(environment: E2EEnvironment) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: environment.databaseUrl }),
    errorFormat: 'colorless',
  })
}

export async function loadBackboneEvidence(
  prisma: PrismaClient,
  ids: BackboneIds,
) {
  const [
    owner,
    primaryWorld,
    secondaryWorld,
    primaryCampaign,
    memberCampaign,
    secondaryCampaign,
    archivedCampaign,
    character,
    location,
    organization,
    relationship,
    worldEvent,
    preferences,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ids.ownerUserId },
      select: { id: true, email: true, username: true },
    }),
    prisma.world.findUnique({
      where: { id: ids.primaryWorldId },
      select: {
        id: true,
        ownerId: true,
        name: true,
        timelines: { select: { id: true, name: true } },
      },
    }),
    prisma.world.findUnique({
      where: { id: ids.secondaryWorldId },
      select: { id: true, ownerId: true, name: true },
    }),
    prisma.campaign.findUnique({
      where: { id: ids.primaryCampaignId },
      select: {
        id: true,
        worldId: true,
        ownerId: true,
        timelineId: true,
        status: true,
        currentWorldPosition: true,
        currentWorldDateLabel: true,
        currentLocationId: true,
        currentFocus: true,
        memberships: {
          select: { userId: true, role: true, capabilities: true },
        },
        campaignCharacters: {
          select: { id: true, worldCharacterId: true },
        },
      },
    }),
    prisma.campaign.findUnique({
      where: { id: ids.memberCampaignId },
      select: { id: true, worldId: true, ownerId: true, status: true },
    }),
    prisma.campaign.findUnique({
      where: { id: ids.secondaryCampaignId },
      select: { id: true, worldId: true, ownerId: true, status: true },
    }),
    prisma.campaign.findUnique({
      where: { id: ids.archivedCampaignId },
      select: { id: true, worldId: true, ownerId: true, status: true },
    }),
    prisma.character.findUnique({
      where: { id: ids.characterId },
      select: {
        id: true,
        ownerUserId: true,
        name: true,
        worldCharacters: {
          select: {
            id: true,
            worldId: true,
            worldEntity: { select: { id: true, worldId: true } },
            campaignCharacters: {
              select: { id: true, campaignId: true },
            },
          },
        },
      },
    }),
    prisma.worldEntity.findUnique({
      where: { id: ids.locationEntityId },
      select: { id: true, worldId: true, name: true, type: true },
    }),
    prisma.worldEntity.findUnique({
      where: { id: ids.organizationEntityId },
      select: { id: true, worldId: true, name: true, type: true },
    }),
    prisma.entityRelationship.findUnique({
      where: { id: ids.relationshipId },
      select: {
        id: true,
        worldId: true,
        sourceEntityId: true,
        targetEntityId: true,
        relationshipType: true,
        label: true,
      },
    }),
    prisma.worldEvent.findUnique({
      where: { id: ids.worldEventId },
      select: {
        id: true,
        timelineId: true,
        title: true,
        startWorldPosition: true,
        startWorldDateLabel: true,
        entities: { select: { worldEntityId: true } },
      },
    }),
    prisma.entryPreference.findMany({
      where: { userId: ids.ownerUserId },
      select: {
        kind: true,
        entryKey: true,
        worldId: true,
        campaignId: true,
        worldCharacterId: true,
        pinned: true,
        lastUsedAt: true,
      },
      orderBy: { entryKey: 'asc' },
    }),
  ])

  return {
    owner,
    primaryWorld,
    secondaryWorld,
    primaryCampaign: primaryCampaign
      ? {
          ...primaryCampaign,
          currentWorldPosition:
            primaryCampaign.currentWorldPosition?.toString() ?? null,
        }
      : null,
    memberCampaign,
    secondaryCampaign,
    archivedCampaign,
    character,
    location,
    organization,
    relationship,
    worldEvent: worldEvent
      ? {
          ...worldEvent,
          startWorldPosition: worldEvent.startWorldPosition.toString(),
        }
      : null,
    preferences,
  }
}

export async function countCampaignCharacter(
  prisma: PrismaClient,
  campaignId: string,
  worldCharacterId: string,
) {
  return prisma.campaignCharacter.count({
    where: { campaignId, worldCharacterId },
  })
}

export async function cleanupE2EFixture(
  prisma: PrismaClient,
  fixture: E2EFixture,
): Promise<CleanupReport> {
  const expectedUsers = Object.values(fixture.users)
  const expectedEmails = new Set(expectedUsers.map((user) => user.email))
  const expectedUsernames = new Set(expectedUsers.map((user) => user.username))
  const expectedWorldNames = new Set([
    fixture.primaryWorld.name,
    fixture.secondaryWorld.name,
  ])
  const expectedCampaignNames = new Set([
    fixture.primaryCampaign.name,
    fixture.memberCampaign.name,
    fixture.secondaryCampaign.name,
    fixture.archivedCampaign.name,
  ])

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: [...expectedEmails] } },
        { username: { in: [...expectedUsernames] } },
      ],
    },
    select: { id: true, email: true, username: true, displayName: true },
  })
  for (const user of users) {
    const expected = expectedUsers.find(
      (candidate) =>
        candidate.email === user.email || candidate.username === user.username,
    )
    invariant(expected, `unexpected test User ${user.id}`)
    invariant(user.email === expected.email, `User ${user.id} email mismatch`)
    invariant(
      user.username === expected.username,
      `User ${user.id} username mismatch`,
    )
    invariant(
      user.displayName === expected.displayName,
      `User ${user.id} display-name marker mismatch`,
    )
  }
  const userIds = users.map((user) => user.id)

  const worlds = await prisma.world.findMany({
    where: { name: { startsWith: fixture.marker } },
    select: { id: true, name: true, description: true, ownerId: true },
  })
  for (const world of worlds) {
    invariant(
      expectedWorldNames.has(world.name),
      `unexpected World ${world.id}`,
    )
    invariant(
      world.description?.startsWith(fixture.marker),
      `World ${world.id} has no ownership marker`,
    )
    invariant(
      world.ownerId === null || userIds.includes(world.ownerId),
      `World ${world.id} has a foreign owner`,
    )
  }
  const worldIds = worlds.map((world) => world.id)

  const campaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { name: { startsWith: fixture.marker } },
        ...(worldIds.length ? [{ worldId: { in: worldIds } }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      ownerId: true,
      worldId: true,
    },
  })
  for (const campaign of campaigns) {
    invariant(
      expectedCampaignNames.has(campaign.name),
      `unexpected Campaign ${campaign.id} in fixture scope`,
    )
    invariant(
      campaign.description?.startsWith(fixture.marker),
      `Campaign ${campaign.id} has no ownership marker`,
    )
    invariant(
      userIds.includes(campaign.ownerId),
      `Campaign ${campaign.id} has a foreign owner`,
    )
    invariant(
      campaign.worldId === null || worldIds.includes(campaign.worldId),
      `Campaign ${campaign.id} points outside the fixture Worlds`,
    )
  }
  const campaignIds = campaigns.map((campaign) => campaign.id)

  const characters = await prisma.character.findMany({
    where: {
      OR: [
        { name: { startsWith: fixture.marker } },
        ...(userIds.length ? [{ ownerUserId: { in: userIds } }] : []),
      ],
    },
    select: { id: true, name: true, ownerUserId: true },
  })
  for (const character of characters) {
    invariant(
      character.name === fixture.character.name,
      `unexpected Character ${character.id}`,
    )
    invariant(
      userIds.includes(character.ownerUserId),
      `Character ${character.id} has a foreign owner`,
    )
  }
  const characterIds = characters.map((character) => character.id)

  const worldCharacters = await prisma.worldCharacter.findMany({
    where: {
      OR: [
        ...(worldIds.length ? [{ worldId: { in: worldIds } }] : []),
        ...(characterIds.length ? [{ characterId: { in: characterIds } }] : []),
      ],
    },
    select: { id: true, worldId: true, characterId: true },
  })
  for (const worldCharacter of worldCharacters) {
    invariant(
      worldIds.includes(worldCharacter.worldId) &&
        characterIds.includes(worldCharacter.characterId),
      `WorldCharacter ${worldCharacter.id} crosses fixture ownership`,
    )
  }

  const entities = worldIds.length
    ? await prisma.worldEntity.findMany({
        where: { worldId: { in: worldIds } },
        select: {
          id: true,
          name: true,
          description: true,
          worldId: true,
          createdById: true,
          worldCharacterId: true,
        },
      })
    : []
  const expectedEntityNames = new Set([
    fixture.character.name,
    fixture.location.name,
    fixture.organization.name,
  ])
  const worldCharacterIds = worldCharacters.map((item) => item.id)
  for (const entity of entities) {
    invariant(
      expectedEntityNames.has(entity.name),
      `unexpected WorldEntity ${entity.id} in fixture World`,
    )
    invariant(
      entity.createdById !== null && userIds.includes(entity.createdById),
      `WorldEntity ${entity.id} has a foreign creator`,
    )
    if (entity.worldCharacterId) {
      invariant(
        worldCharacterIds.includes(entity.worldCharacterId),
        `WorldEntity ${entity.id} links a foreign WorldCharacter`,
      )
    } else {
      invariant(
        entity.description?.startsWith(fixture.marker),
        `WorldEntity ${entity.id} has no ownership marker`,
      )
    }
  }

  const relationships = worldIds.length
    ? await prisma.entityRelationship.findMany({
        where: { worldId: { in: worldIds } },
        select: { id: true, label: true, createdById: true },
      })
    : []
  for (const relationship of relationships) {
    invariant(
      relationship.label?.startsWith(fixture.marker),
      `EntityRelationship ${relationship.id} has no ownership marker`,
    )
    invariant(
      relationship.createdById !== null &&
        userIds.includes(relationship.createdById),
      `EntityRelationship ${relationship.id} has a foreign creator`,
    )
  }

  const memberships = await Promise.all([
    worldIds.length
      ? prisma.worldMembership.findMany({
          where: { worldId: { in: worldIds } },
          select: { id: true, userId: true },
        })
      : [],
    campaignIds.length
      ? prisma.campaignMembership.findMany({
          where: { campaignId: { in: campaignIds } },
          select: { id: true, userId: true },
        })
      : [],
  ])
  for (const membership of memberships.flat()) {
    invariant(
      userIds.includes(membership.userId),
      `Membership ${membership.id} references a foreign User`,
    )
  }

  const invitations = await prisma.membershipInvitation.findMany({
    where: {
      OR: [
        ...(worldIds.length ? [{ worldId: { in: worldIds } }] : []),
        ...(campaignIds.length ? [{ campaignId: { in: campaignIds } }] : []),
      ],
    },
    select: { id: true, createdById: true, acceptedById: true },
  })
  for (const invitation of invitations) {
    invariant(
      userIds.includes(invitation.createdById),
      `Invitation ${invitation.id} has a foreign creator`,
    )
    invariant(
      invitation.acceptedById === null ||
        userIds.includes(invitation.acceptedById),
      `Invitation ${invitation.id} has a foreign acceptor`,
    )
  }

  const report = await prisma.$transaction(async (transaction) => {
    const campaignResult = campaignIds.length
      ? await transaction.campaign.deleteMany({
          where: { id: { in: campaignIds } },
        })
      : { count: 0 }
    const worldResult = worldIds.length
      ? await transaction.world.deleteMany({ where: { id: { in: worldIds } } })
      : { count: 0 }
    const characterResult = characterIds.length
      ? await transaction.character.deleteMany({
          where: { id: { in: characterIds } },
        })
      : { count: 0 }
    const userResult = userIds.length
      ? await transaction.user.deleteMany({ where: { id: { in: userIds } } })
      : { count: 0 }
    return {
      campaigns: campaignResult.count,
      worlds: worldResult.count,
      characters: characterResult.count,
      users: userResult.count,
      retained: [] as string[],
    }
  })

  const remaining = await Promise.all([
    prisma.user.count({ where: { email: { in: [...expectedEmails] } } }),
    prisma.world.count({ where: { name: { startsWith: fixture.marker } } }),
    prisma.campaign.count({ where: { name: { startsWith: fixture.marker } } }),
    prisma.character.count({ where: { name: { startsWith: fixture.marker } } }),
  ])
  invariant(
    remaining.every((count) => count === 0),
    `cleanup left namespaced records behind (${remaining.join(', ')})`,
  )

  return report
}
