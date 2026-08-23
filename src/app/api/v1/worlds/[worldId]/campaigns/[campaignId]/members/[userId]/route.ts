import { NextResponse } from 'next/server'
import { membershipErrorResponse } from '@/app/api/v1/memberships/_lib/membership-response'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  campaignMembershipService,
  getCampaignOverview,
  isCampaignCapability,
  type CampaignRole,
} from '@/server/campaigns'
import { worldMembershipService } from '@/server/worlds/world-membership-service'

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
      request.json() as Promise<{
        role?: unknown
        capability?: unknown
        enabled?: unknown
      }>,
    ])
    const routeError = await assertRouteCampaign(worldId, campaignId, actor.id)
    if (routeError) return routeError

    if (body.capability !== undefined) {
      if (
        !isCampaignCapability(body.capability) ||
        typeof body.enabled !== 'boolean'
      ) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_CAMPAIGN_CAPABILITY',
              message:
                'A valid Campaign capability and enabled state are required.',
            },
          },
          { status: 400 },
        )
      }
      const membership = await campaignMembershipService.setMemberCapability({
        actorUserId: actor.id,
        campaignId,
        userId,
        capability: body.capability,
        enabled: body.enabled,
      })
      return NextResponse.json({ membership })
    }

    const role = body.role as CampaignRole
    const membership = await campaignMembershipService.changeMemberRole({
      actorUserId: actor.id,
      campaignId,
      userId,
      role,
    })
    if (role === 'SPECTATOR') {
      await worldMembershipService.ensureViewerAccess(userId, worldId)
    }
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
