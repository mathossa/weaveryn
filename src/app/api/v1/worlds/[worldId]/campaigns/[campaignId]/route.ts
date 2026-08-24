import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  campaignService,
  getCampaignOverview,
  parseCampaignManagementInput,
} from '@/server/campaigns'
import { campaignApiErrorResponse } from './_lib/campaign-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; campaignId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const [{ worldId, campaignId }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    const campaign = await getCampaignOverview(worldId, campaignId, user.id)
    if (!campaign) {
      return NextResponse.json(
        {
          error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found.' },
        },
        { status: 404 },
      )
    }
    return NextResponse.json({ campaign })
  } catch (error) {
    return campaignApiErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const [{ worldId, campaignId }, user, input] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json().then(parseCampaignManagementInput),
    ])

    const accessibleCampaign = await getCampaignOverview(
      worldId,
      campaignId,
      user.id,
    )
    if (!accessibleCampaign) {
      return NextResponse.json(
        {
          error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found.' },
        },
        { status: 404 },
      )
    }

    const campaign = await campaignService.updateCampaignManagement(
      campaignId,
      user.id,
      input,
    )
    return NextResponse.json({ campaign })
  } catch (error) {
    return campaignApiErrorResponse(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const [{ worldId, campaignId }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    await campaignService.deleteCampaign({
      campaignId,
      worldId,
      actorUserId: user.id,
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return campaignApiErrorResponse(error)
  }
}
