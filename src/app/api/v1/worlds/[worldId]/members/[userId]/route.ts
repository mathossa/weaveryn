import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import type { WorldRole } from '@/server/worlds'
import { worldMembershipService } from '@/server/worlds/world-membership-service'
import { membershipErrorResponse } from '../../../../memberships/_lib/membership-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; userId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const [{ worldId, userId }, actor, body] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json() as Promise<{ role?: unknown }>,
    ])
    const membership = await worldMembershipService.changeMemberRole({
      actorUserId: actor.id,
      worldId,
      userId,
      role: body.role as WorldRole,
    })
    return NextResponse.json({ membership })
  } catch (error) {
    return membershipErrorResponse(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const [{ worldId, userId }, actor] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    await worldMembershipService.removeMember({
      actorUserId: actor.id,
      worldId,
      userId,
    })
    return new Response(null, { status: 204 })
  } catch (error) {
    return membershipErrorResponse(error)
  }
}
