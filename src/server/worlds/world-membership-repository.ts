import type { WorldRole } from './world-role'

export type { WorldRole } from './world-role'

export interface WorldReference {
  id: string
  ownerId: string | null
}

export interface WorldMembershipRecord {
  id: string
  worldId: string
  userId: string
  role: WorldRole
  joinedAt: Date
  updatedAt: Date
}

export interface CreateWorldMembershipInput {
  worldId: string
  userId: string
  role: WorldRole
}

export interface WorldMembershipRepository {
  findWorldById(worldId: string): Promise<WorldReference | null>
  userExists(userId: string): Promise<boolean>
  findMembership(
    worldId: string,
    userId: string,
  ): Promise<WorldMembershipRecord | null>
  createMembership(
    input: CreateWorldMembershipInput,
  ): Promise<WorldMembershipRecord>
  updateMembershipRole(
    worldId: string,
    userId: string,
    role: WorldRole,
  ): Promise<WorldMembershipRecord | null>
  deleteMembership(worldId: string, userId: string): Promise<boolean>
}

export class WorldMembershipRepositoryConflictError extends Error {
  constructor() {
    super('A membership already exists for this user and World.')
    this.name = 'WorldMembershipRepositoryConflictError'
  }
}
