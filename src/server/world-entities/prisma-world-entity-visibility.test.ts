import { describe, expect, it } from 'vitest'
import type { PrismaClient } from '@/generated/prisma/client'
import { PrismaWorldEntityRepository } from './prisma-world-entity-repository'

const worldId = '40000000-0000-4000-8000-000000000010'
const userId = '40000000-0000-4000-8000-000000000001'
const campaignOneId = '40000000-0000-4000-8000-000000000020'
const campaignTwoId = '40000000-0000-4000-8000-000000000021'

describe('PrismaWorldEntityRepository visible entity query', () => {
  it('pushes campaign-only visibility and Character participation into Prisma', async () => {
    let query: Record<string, unknown> | undefined
    const client = {
      worldEntity: {
        findMany: async (input: Record<string, unknown>) => {
          query = input
          return []
        },
      },
    } as unknown as PrismaClient
    const repository = new PrismaWorldEntityRepository(client)

    await repository.listVisibleEntities(worldId, {
      userId,
      hasWorldAccess: false,
      campaignIds: [campaignOneId, campaignTwoId],
      gmCampaignIds: [campaignTwoId],
    })

    expect(query?.where).toEqual({
      worldId,
      OR: [
        {
          worldCharacter: {
            is: {
              campaignCharacters: {
                some: {
                  campaignId: { in: [campaignOneId, campaignTwoId] },
                },
              },
            },
          },
        },
        {
          worldCharacterId: null,
          OR: [
            { visibilityScope: 'PRIVATE', createdById: userId },
            {
              visibilityScope: 'PLAYER',
              visibilityUserId: userId,
              OR: [
                { visibilityCampaignId: null },
                {
                  visibilityCampaignId: {
                    in: [campaignOneId, campaignTwoId],
                  },
                },
              ],
            },
            {
              visibilityScope: 'CAMPAIGN',
              visibilityCampaignId: {
                in: [campaignOneId, campaignTwoId],
              },
            },
            {
              visibilityScope: 'GM',
              visibilityCampaignId: { in: [campaignTwoId] },
            },
          ],
        },
      ],
    })
  })

  it('includes all Character identities and WORLD content for World access', async () => {
    let query: Record<string, unknown> | undefined
    const client = {
      worldEntity: {
        findMany: async (input: Record<string, unknown>) => {
          query = input
          return []
        },
      },
    } as unknown as PrismaClient
    const repository = new PrismaWorldEntityRepository(client)

    await repository.listVisibleEntities(worldId, {
      userId,
      hasWorldAccess: true,
      campaignIds: [],
      gmCampaignIds: [],
    })

    expect(query?.where).toEqual({
      worldId,
      OR: [
        { worldCharacterId: { not: null } },
        {
          worldCharacterId: null,
          OR: [
            { visibilityScope: 'PRIVATE', createdById: userId },
            {
              visibilityScope: 'PLAYER',
              visibilityUserId: userId,
              OR: [{ visibilityCampaignId: null }],
            },
            { visibilityScope: 'WORLD' },
          ],
        },
      ],
    })
  })
})
