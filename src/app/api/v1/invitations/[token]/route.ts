import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import { membershipInvitationService } from '@/server/invitations'
import { invitationErrorResponse } from '../_lib/invitation-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params
    const invitation =
      await membershipInvitationService.previewInvitation(token)
    return NextResponse.json({ invitation })
  } catch (error) {
    return invitationErrorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const [{ token }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    const accepted = await membershipInvitationService.acceptInvitation({
      userId: user.id,
      token,
    })
    return NextResponse.json({ accepted })
  } catch (error) {
    return invitationErrorResponse(error)
  }
}
