import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import { membershipInvitationService } from '@/server/invitations'
import { invitationErrorResponse } from '../../_lib/invitation-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ invitationId: string }>
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const [{ invitationId }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    await membershipInvitationService.revokeInvitation({
      actorUserId: user.id,
      invitationId,
    })
    return NextResponse.json({ revoked: true })
  } catch (error) {
    return invitationErrorResponse(error)
  }
}
