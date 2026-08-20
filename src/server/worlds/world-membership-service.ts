import { prisma } from '../../lib/prisma'
import {
  userNotFound,
  worldMembershipAlreadyExists,
  worldMembershipNotFound,
  worldOwnerCannotBeMember,
  worldOwnerCannotLeaveMembership,
} from './world-errors'
import {
  WorldMembershipRepositoryConflictError,
  type WorldMembershipRecord,
  type WorldMembershipRepository,
} from './world-membership-repository'
import { PrismaWorldMembershipRepository } from './prisma-world-membership-repository'
import {
  WORLD_PERMISSIONS,
  WorldAuthorizationService,
} from './world-permissions'
import { assertWorldRole, type WorldRole } from './world-role'

export interface AddWorldMemberInput {
  actorUserId: string
  worldId: string
  userId: string
  role: WorldRole
}

export type ChangeWorldMemberRoleInput = AddWorldMemberInput

export interface RemoveWorldMemberInput {
  actorUserId: string
  worldId: string
  userId: string
}

export interface LeaveWorldInput {
  userId: string
  worldId: string
}

export class WorldMembershipService {
  private readonly authorization: WorldAuthorizationService

  constructor(
    private readonly repository: WorldMembershipRepository,
    authorization?: WorldAuthorizationService,
  ) {
    this.authorization =
      authorization ?? new WorldAuthorizationService(repository)
  }

  async ensureViewerAccess(
    userId: string,
    worldId: string,
  ): Promise<WorldMembershipRecord | null> {
    const access = await this.authorization.getAccess(userId, worldId)
    if (access.isOwner) return null

    const current = await this.repository.findMembership(worldId, userId)
    if (current) return current

    if (!(await this.repository.userExists(userId))) {
      throw userNotFound(userId)
    }

    try {
      return await this.repository.createMembership({
        worldId,
        userId,
        role: 'VIEWER',
      })
    } catch (error) {
      if (error instanceof WorldMembershipRepositoryConflictError) {
        const concurrent = await this.repository.findMembership(worldId, userId)
        if (concurrent) return concurrent
      }
      throw error
    }
  }

  async addMember(input: AddWorldMemberInput): Promise<WorldMembershipRecord> {
    assertWorldRole(input.role)

    const actorAccess = await this.authorization.assertPermission(
      input.actorUserId,
      input.worldId,
      WORLD_PERMISSIONS.MANAGE_MEMBERS,
    )

    if (actorAccess.ownerId === input.userId) {
      throw worldOwnerCannotBeMember(input.worldId, input.userId)
    }

    if (!(await this.repository.userExists(input.userId))) {
      throw userNotFound(input.userId)
    }

    if (await this.repository.findMembership(input.worldId, input.userId)) {
      throw worldMembershipAlreadyExists(input.worldId, input.userId)
    }

    try {
      return await this.repository.createMembership({
        worldId: input.worldId,
        userId: input.userId,
        role: input.role,
      })
    } catch (error) {
      if (error instanceof WorldMembershipRepositoryConflictError) {
        throw worldMembershipAlreadyExists(input.worldId, input.userId)
      }

      throw error
    }
  }

  async changeMemberRole(
    input: ChangeWorldMemberRoleInput,
  ): Promise<WorldMembershipRecord> {
    assertWorldRole(input.role)

    const actorAccess = await this.authorization.assertPermission(
      input.actorUserId,
      input.worldId,
      WORLD_PERMISSIONS.MANAGE_MEMBERS,
    )

    if (actorAccess.ownerId === input.userId) {
      throw worldOwnerCannotBeMember(input.worldId, input.userId)
    }

    const membership = await this.repository.updateMembershipRole(
      input.worldId,
      input.userId,
      input.role,
    )

    if (!membership) {
      throw worldMembershipNotFound(input.worldId, input.userId)
    }

    return membership
  }

  async removeMember(input: RemoveWorldMemberInput): Promise<void> {
    const actorAccess = await this.authorization.assertPermission(
      input.actorUserId,
      input.worldId,
      WORLD_PERMISSIONS.MANAGE_MEMBERS,
    )

    if (actorAccess.ownerId === input.userId) {
      throw worldOwnerCannotBeMember(input.worldId, input.userId)
    }

    if (
      !(await this.repository.deleteMembership(input.worldId, input.userId))
    ) {
      throw worldMembershipNotFound(input.worldId, input.userId)
    }
  }

  async leaveWorld(input: LeaveWorldInput): Promise<void> {
    const access = await this.authorization.getAccess(
      input.userId,
      input.worldId,
    )

    if (access.isOwner) {
      throw worldOwnerCannotLeaveMembership(input.worldId, input.userId)
    }

    if (access.role === null) {
      throw worldMembershipNotFound(input.worldId, input.userId)
    }

    if (
      !(await this.repository.deleteMembership(input.worldId, input.userId))
    ) {
      throw worldMembershipNotFound(input.worldId, input.userId)
    }
  }
}

export const worldMembershipService = new WorldMembershipService(
  new PrismaWorldMembershipRepository(prisma),
)
