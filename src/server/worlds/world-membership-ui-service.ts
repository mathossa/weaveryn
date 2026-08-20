import { prisma } from '../../lib/prisma'
import type { WorldRole } from './world-role'

export interface ManagedWorldMembership {
  userId: string
  username: string
  displayName: string | null
  role: WorldRole
}

export async function listWorldMembershipsForManagement(
  worldId: string,
  actorUserId: string,
): Promise<ManagedWorldMembership[] | null> {
  const world = await prisma.world.findFirst({
    where: {
      id: worldId,
      OR: [
        { ownerId: actorUserId },
        { memberships: { some: { userId: actorUserId, role: 'ADMIN' } } },
      ],
    },
    select: {
      memberships: {
        select: {
          userId: true,
          role: true,
          user: {
            select: { username: true, displayName: true },
          },
        },
        orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
      },
    },
  })

  if (!world) return null

  return world.memberships.map((membership) => ({
    userId: membership.userId,
    username: membership.user.username,
    displayName: membership.user.displayName,
    role: membership.role,
  }))
}
