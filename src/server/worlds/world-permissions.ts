import { worldNotFound, worldPermissionDenied } from './world-errors'
import type { WorldMembershipRepository } from './world-membership-repository'
import type { WorldRole } from './world-role'

export const WORLD_PERMISSIONS = {
  VIEW_WORLD: 'VIEW_WORLD',
  EDIT_CONTENT: 'EDIT_CONTENT',
  MANAGE_MEMBERS: 'MANAGE_MEMBERS',
  CREATE_CAMPAIGN: 'CREATE_CAMPAIGN',
  MANAGE_CONFIGURATION: 'MANAGE_CONFIGURATION',
  MANAGE_LIFECYCLE: 'MANAGE_LIFECYCLE',
  MANAGE_OWNERSHIP: 'MANAGE_OWNERSHIP',
} as const

export type WorldPermission =
  (typeof WORLD_PERMISSIONS)[keyof typeof WORLD_PERMISSIONS]

const allWorldPermissions = new Set<WorldPermission>(
  Object.values(WORLD_PERMISSIONS),
)

const rolePermissions: Record<WorldRole, ReadonlySet<WorldPermission>> = {
  ADMIN: new Set([
    WORLD_PERMISSIONS.VIEW_WORLD,
    WORLD_PERMISSIONS.EDIT_CONTENT,
    WORLD_PERMISSIONS.MANAGE_MEMBERS,
    WORLD_PERMISSIONS.CREATE_CAMPAIGN,
  ]),
  MEMBER: new Set([
    WORLD_PERMISSIONS.VIEW_WORLD,
    WORLD_PERMISSIONS.EDIT_CONTENT,
  ]),
  VIEWER: new Set([WORLD_PERMISSIONS.VIEW_WORLD]),
}

export interface WorldAccess {
  worldId: string
  ownerId: string | null
  userId: string
  isOwner: boolean
  role: WorldRole | null
}

export type WorldAuthorizationRepository = Pick<
  WorldMembershipRepository,
  'findWorldById' | 'findMembership'
>

export function hasWorldPermission(
  access: WorldAccess,
  permission: WorldPermission,
) {
  if (access.isOwner) {
    return allWorldPermissions.has(permission)
  }

  return access.role !== null && rolePermissions[access.role].has(permission)
}

export class WorldAuthorizationService {
  constructor(private readonly repository: WorldAuthorizationRepository) {}

  async getAccess(userId: string, worldId: string): Promise<WorldAccess> {
    const world = await this.repository.findWorldById(worldId)

    if (!world) {
      throw worldNotFound(worldId)
    }

    const isOwner = world.ownerId === userId

    if (isOwner) {
      return {
        worldId,
        ownerId: world.ownerId,
        userId,
        isOwner: true,
        role: null,
      }
    }

    const membership = await this.repository.findMembership(worldId, userId)

    return {
      worldId,
      ownerId: world.ownerId,
      userId,
      isOwner: false,
      role: membership?.role ?? null,
    }
  }

  async assertPermission(
    userId: string,
    worldId: string,
    permission: WorldPermission,
  ): Promise<WorldAccess> {
    const access = await this.getAccess(userId, worldId)

    if (!hasWorldPermission(access, permission)) {
      throw worldPermissionDenied(worldId, userId)
    }

    return access
  }
}
