import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import { getCampaignOverview, type CampaignRole } from '@/server/campaigns'
import { membershipInvitationService } from '@/server/invitations'
import { invitationErrorResponse } from '../../../../../invitations/_lib/invitation-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; campaignId: string }>
}

async function assertRouteCampaign(
  worldId: string,
  campaignId: string,
  userId: string,
) {
  const campaign = await getCampaignOverview(worldId, campaignId, userId)
  if (!campaign) {
    return NextResponse.json(
      { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found.' } },
      { status: 404 },
    )
  }
  return null
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const [{ worldId, campaignId }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    const routeError = await assertRouteCampaign(worldId, campaignId, user.id)
    if (routeError) return routeError

    const invitations =
      await membershipInvitationService.listCampaignInvitations({
        actorUserId: user.id,
        campaignId,
      })
    return NextResponse.json({ invitations })
  } catch (error) {
    return invitationErrorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const [{ worldId, campaignId }, user, body] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json() as Promise<{ role?: unknown }>,
    ])
    const routeError = await assertRouteCampaign(worldId, campaignId, user.id)
    if (routeError) return routeError

    const created = await membershipInvitationService.createCampaignInvitation({
      actorUserId: user.id,
      campaignId,
      role: body.role as CampaignRole,
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
