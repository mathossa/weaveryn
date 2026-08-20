import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import { membershipInvitationService } from '@/server/invitations'
import type { WorldRole } from '@/server/worlds'
import { invitationErrorResponse } from '../../../invitations/_lib/invitation-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const [{ worldId }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    const invitations = await membershipInvitationService.listWorldInvitations({
      actorUserId: user.id,
      worldId,
    })
    return NextResponse.json({ invitations })
  } catch (error) {
    return invitationErrorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const [{ worldId }, user, body] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json() as Promise<{ role?: unknown }>,
    ])
    const created = await membershipInvitationService.createWorldInvitation({
      actorUserId: user.id,
      worldId,
      role: body.role as WorldRole,
    })
    return NextResponse.json(
      {
        invitation: created.invitation,
        invitePath: `/invite/${created.token}`,
      },
      { status: 201 },
    )
  } catch (error) {
    return invitationErrorResponse(error)
  }
}
