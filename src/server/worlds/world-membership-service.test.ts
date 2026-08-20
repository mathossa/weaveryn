import { beforeEach, describe, expect, it } from 'vitest'
import type {
  CreateWorldMembershipInput,
  WorldMembershipRecord,
  WorldMembershipRepository,
  WorldReference,
  WorldRole,
} from './world-membership-repository'
import { WorldMembershipRepositoryConflictError } from './world-membership-repository'
import { WorldMembershipService } from './world-membership-service'

const WORLD_ID = 'world-1'
const OWNER_ID = 'owner-1'
const ADMIN_ID = 'admin-1'
const MEMBER_ID = 'member-1'
const VIEWER_ID = 'viewer-1'
const TARGET_ID = 'target-1'

class InMemoryWorldMembershipRepository implements WorldMembershipRepository {
  private readonly worlds = new Map<string, WorldReference>()
  private readonly users = new Set<string>()
  private readonly memberships = new Map<string, WorldMembershipRecord>()
  private sequence = 0

  addWorld(world: WorldReference) {
    this.worlds.set(world.id, world)
  }

  addUser(userId: string) {
    this.users.add(userId)
  }

  addExistingMembership(worldId: string, userId: string, role: WorldRole) {
    return this.createMembership({ worldId, userId, role })
  }

  findWorldById(worldId: string) {
    return Promise.resolve(this.worlds.get(worldId) ?? null)
  }

  userExists(userId: string) {
    return Promise.resolve(this.users.has(userId))
  }

  findMembership(worldId: string, userId: string) {
    return Promise.resolve(
      this.memberships.get(this.key(worldId, userId)) ?? null,
    )
  }

  createMembership(input: CreateWorldMembershipInput) {
    const key = this.key(input.worldId, input.userId)

    if (this.memberships.has(key)) {
      return Promise.reject(new WorldMembershipRepositoryConflictError())
    }

    const now = new Date('2026-08-14T00:00:00.000Z')
    const membership: WorldMembershipRecord = {
      id: `membership-${++this.sequence}`,
      ...input,
      joinedAt: now,
      updatedAt: now,
    }

    this.memberships.set(key, membership)
    return Promise.resolve(membership)
  }

  updateMembershipRole(worldId: string, userId: string, role: WorldRole) {
    const key = this.key(worldId, userId)
    const membership = this.memberships.get(key)

    if (!membership) {
      return Promise.resolve(null)
    }

    const updated = { ...membership, role }
    this.memberships.set(key, updated)
    return Promise.resolve(updated)
  }

  deleteMembership(worldId: string, userId: string) {
    return Promise.resolve(this.memberships.delete(this.key(worldId, userId)))
  }

  private key(worldId: string, userId: string) {
    return `${worldId}:${userId}`
  }
}

describe('WorldMembershipService', () => {
  let repository: InMemoryWorldMembershipRepository
  let service: WorldMembershipService

  beforeEach(async () => {
    repository = new InMemoryWorldMembershipRepository()
    repository.addWorld({ id: WORLD_ID, ownerId: OWNER_ID })

    for (const userId of [
      OWNER_ID,
      ADMIN_ID,
      MEMBER_ID,
      VIEWER_ID,
      TARGET_ID,
    ]) {
      repository.addUser(userId)
    }

    await repository.addExistingMembership(WORLD_ID, ADMIN_ID, 'ADMIN')
    await repository.addExistingMembership(WORLD_ID, MEMBER_ID, 'MEMBER')
    await repository.addExistingMembership(WORLD_ID, VIEWER_ID, 'VIEWER')
    service = new WorldMembershipService(repository)
  })

  it('ensures read-only World access without requiring membership-management authority', async () => {
    await expect(service.ensureViewerAccess(TARGET_ID, WORLD_ID)).resolves.toMatchObject({
      worldId: WORLD_ID,
      userId: TARGET_ID,
      role: 'VIEWER',
    })
  })

  it('does not downgrade existing World access when ensuring viewer access', async () => {
    await expect(service.ensureViewerAccess(MEMBER_ID, WORLD_ID)).resolves.toMatchObject({
      role: 'MEMBER',
    })
    await expect(service.ensureViewerAccess(OWNER_ID, WORLD_ID)).resolves.toBeNull()
  })

  it.each<WorldRole>(['ADMIN', 'MEMBER', 'VIEWER'])(
    'allows the owner to add a %s membership',
    async (role) => {
      const membership = await service.addMember({
        actorUserId: OWNER_ID,
        worldId: WORLD_ID,
        userId: TARGET_ID,
        role,
      })

      expect(membership).toMatchObject({
        worldId: WORLD_ID,
        userId: TARGET_ID,
        role,
      })
    },
  )

  it('allows an ADMIN to add, change, and remove memberships', async () => {
    await service.addMember({
      actorUserId: ADMIN_ID,
      worldId: WORLD_ID,
      userId: TARGET_ID,
      role: 'VIEWER',
    })

    await expect(
      service.changeMemberRole({
        actorUserId: ADMIN_ID,
        worldId: WORLD_ID,
        userId: TARGET_ID,
        role: 'MEMBER',
      }),
    ).resolves.toMatchObject({ role: 'MEMBER' })

    await service.removeMember({
      actorUserId: ADMIN_ID,
      worldId: WORLD_ID,
      userId: TARGET_ID,
    })

    await expect(
      repository.findMembership(WORLD_ID, TARGET_ID),
    ).resolves.toBeNull()
  })

  it.each([MEMBER_ID, VIEWER_ID, TARGET_ID])(
    'rejects membership management by %s',
    async (actorUserId) => {
      await expect(
        service.addMember({
          actorUserId,
          worldId: WORLD_ID,
          userId: TARGET_ID,
          role: 'MEMBER',
        }),
      ).rejects.toMatchObject({ code: 'WORLD_PERMISSION_DENIED' })
    },
  )

  it('rejects duplicate memberships', async () => {
    await expect(
      service.addMember({
        actorUserId: OWNER_ID,
        worldId: WORLD_ID,
        userId: MEMBER_ID,
        role: 'VIEWER',
      }),
    ).rejects.toMatchObject({ code: 'WORLD_MEMBERSHIP_ALREADY_EXISTS' })
  })

  it('rejects a membership for the World owner', async () => {
    await expect(
      service.addMember({
        actorUserId: ADMIN_ID,
        worldId: WORLD_ID,
        userId: OWNER_ID,
        role: 'ADMIN',
      }),
    ).rejects.toMatchObject({ code: 'WORLD_OWNER_CANNOT_BE_MEMBER' })
  })

  it('rejects a membership for an unknown User', async () => {
    await expect(
      service.addMember({
        actorUserId: OWNER_ID,
        worldId: WORLD_ID,
        userId: 'missing-user',
        role: 'MEMBER',
      }),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' })
  })

  it('rejects role changes and removals for missing memberships', async () => {
    await expect(
      service.changeMemberRole({
        actorUserId: OWNER_ID,
        worldId: WORLD_ID,
        userId: TARGET_ID,
        role: 'VIEWER',
      }),
    ).rejects.toMatchObject({ code: 'WORLD_MEMBERSHIP_NOT_FOUND' })

    await expect(
      service.removeMember({
        actorUserId: OWNER_ID,
        worldId: WORLD_ID,
        userId: TARGET_ID,
      }),
    ).rejects.toMatchObject({ code: 'WORLD_MEMBERSHIP_NOT_FOUND' })
  })

  it.each([ADMIN_ID, MEMBER_ID, VIEWER_ID])(
    'allows member %s to leave the World',
    async (userId) => {
      await service.leaveWorld({ worldId: WORLD_ID, userId })

      await expect(
        repository.findMembership(WORLD_ID, userId),
      ).resolves.toBeNull()
    },
  )

  it('requires the owner to transfer or relinquish ownership instead of leaving', async () => {
    await expect(
      service.leaveWorld({ worldId: WORLD_ID, userId: OWNER_ID }),
    ).rejects.toMatchObject({ code: 'WORLD_OWNER_CANNOT_LEAVE_MEMBERSHIP' })
  })

  it('rejects a leave request from a non-member', async () => {
    await expect(
      service.leaveWorld({ worldId: WORLD_ID, userId: TARGET_ID }),
    ).rejects.toMatchObject({ code: 'WORLD_MEMBERSHIP_NOT_FOUND' })
  })
})
