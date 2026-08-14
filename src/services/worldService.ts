import { prisma } from '../lib/prisma'

export const MAIN_WORLD_TIMELINE_NAME = 'Main'

export interface CreateWorldInput {
  creatorId: string
  name: string
  description?: string | null
}

export interface UpdateWorldInput {
  name?: string
  description?: string | null
}

export type WorldServiceDatabase = Pick<
  typeof prisma,
  '$transaction' | 'world' | 'worldTimeline'
>

export class WorldUpdateForbiddenError extends Error {
  readonly code = 'WORLD_UPDATE_FORBIDDEN'

  constructor() {
    super('World does not exist or the user is not authorized to update it.')
    this.name = 'WorldUpdateForbiddenError'
  }
}

function accessibleWorldFilter(userId: string) {
  // Campaign-derived access joins this filter when Campaign persistence is
  // introduced in issue #15; issue #10 explicitly excludes Campaign models.
  return {
    OR: [
      { ownerId: userId },
      {
        memberships: {
          some: { userId },
        },
      },
    ],
  }
}

function worldUpdateFilter(worldId: string, userId: string) {
  return {
    id: worldId,
    OR: [
      { ownerId: userId },
      {
        memberships: {
          some: {
            userId,
            role: 'ADMIN' as const,
          },
        },
      },
    ],
  }
}

export function createWorldService(database: WorldServiceDatabase = prisma) {
  return {
    async createWorld(input: CreateWorldInput) {
      return database.$transaction(async (transaction) => {
        const world = await transaction.world.create({
          data: {
            name: input.name,
            description: input.description,
            ownerId: input.creatorId,
          },
        })

        await transaction.worldTimeline.create({
          data: {
            worldId: world.id,
            name: MAIN_WORLD_TIMELINE_NAME,
          },
        })

        return world
      })
    },

    async loadWorldById(worldId: string, userId: string) {
      return database.world.findFirst({
        where: {
          id: worldId,
          ...accessibleWorldFilter(userId),
        },
      })
    },

    async listAccessibleWorlds(userId: string) {
      return database.world.findMany({
        where: accessibleWorldFilter(userId),
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      })
    },

    async updateWorld(
      worldId: string,
      userId: string,
      input: UpdateWorldInput,
    ) {
      return database.$transaction(async (transaction) => {
        const data: UpdateWorldInput = {}

        if (input.name !== undefined) {
          data.name = input.name
        }

        if (input.description !== undefined) {
          data.description = input.description
        }

        const result = await transaction.world.updateMany({
          where: worldUpdateFilter(worldId, userId),
          data,
        })

        if (result.count !== 1) {
          throw new WorldUpdateForbiddenError()
        }

        return transaction.world.findUniqueOrThrow({
          where: { id: worldId },
        })
      })
    },
  }
}

export const worldService = createWorldService()
