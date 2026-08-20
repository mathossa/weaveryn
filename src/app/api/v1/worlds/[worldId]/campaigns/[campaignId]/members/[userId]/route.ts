import { NextResponse } from 'next/server'
import { membershipErrorResponse } from '@/app/api/v1/memberships/_lib/membership-response'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  campaignMembershipService,
  getCampaignOverview,
  type CampaignRole,
} from '@/server/campaigns'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; campaignId: string; userId: string }>
}

async function assertRouteCampaign(
  worldId: string,
  campaignId: string,
  actorUserId: string,
) {
  const campaign = await getCampaignOverview(worldId, campaignId, actorUserId)
  if (campaign) return null
  return NextResponse.json(
    { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found.' } },
    { status: 404 },
  )
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const [{ worldId, campaignId, userId }, actor, body] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json() as Promise<{ role?: unknown }>,
    ])
    const routeError = await assertRouteCampaign(worldId, campaignId, actor.id)
    if (routeError) return routeError

    const membership = await campaignMembershipService.changeMemberRole({
      actorUserId: actor.id,
      campaignId,
      userId,
      role: body.role as CampaignRole,
    })
    return NextResponse.json({ membership })
  } catch (error) {
    return membershipErrorResponse(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const [{ worldId, campaignId, userId }, actor] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    const routeError = await assertRouteCampaign(worldId, campaignId, actor.id)
    if (routeError) return routeError

    await campaignMembershipService.removeMember({
      actorUserId: actor.id,
      campaignId,
      userId,
    })
    return new Response(null, { status: 204 })
  } catch (error) {
    return membershipErrorResponse(error)
  }
}
