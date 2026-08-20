import { Prisma, type PrismaClient } from '../../generated/prisma/client'
import {
  WorldMembershipRepositoryConflictError,
  type CreateWorldMembershipInput,
  type WorldMembershipRecord,
  type WorldMembershipRepository,
  type WorldReference,
  type WorldRole,
} from './world-membership-repository'

type WorldMembershipDatabaseClient = PrismaClient | Prisma.TransactionClient

export class PrismaWorldMembershipRepository implements WorldMembershipRepository {
  constructor(
    private readonly rootClient: PrismaClient,
    private readonly client: WorldMembershipDatabaseClient = rootClient,
  ) {}

  findWorldById(worldId: string): Promise<WorldReference | null> {
    return this.client.world.findUnique({
      where: { id: worldId },
      select: { id: true, ownerId: true },
    })
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.client.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    return user !== null
  }

  findMembership(
    worldId: string,
    userId: string,
  ): Promise<WorldMembershipRecord | null> {
    return this.client.worldMembership.findUnique({
      where: { worldId_userId: { worldId, userId } },
    })
  }

  async createMembership(
    input: CreateWorldMembershipInput,
  ): Promise<WorldMembershipRecord> {
    try {
      return await this.client.worldMembership.create({ data: input })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new WorldMembershipRepositoryConflictError()
      }

      throw error
    }
  }

  async updateMembershipRole(
    worldId: string,
    userId: string,
    role: WorldRole,
  ): Promise<WorldMembershipRecord | null> {
    try {
      return await this.client.worldMembership.update({
        where: { worldId_userId: { worldId, userId } },
        data: { role },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null
      }

      throw error
    }
  }

  async deleteMembership(worldId: string, userId: string): Promise<boolean> {
    const result = await this.client.worldMembership.deleteMany({
      where: { worldId, userId },
    })

    return result.count === 1
  }
}
