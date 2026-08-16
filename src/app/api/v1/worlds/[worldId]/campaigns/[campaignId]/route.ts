import { NextResponse } from 'next/server'
import { AuthDomainError, requireAuthenticatedUser } from '@/server/auth'
import {
  CampaignDomainError,
  CampaignInputError,
  campaignService,
  getCampaignOverview,
  parseCampaignManagementInput,
} from '@/server/campaigns'

export const runtime = 'nodejs'

function errorResponse(error: unknown) {
  if (error instanceof AuthDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 401 },
    )
  }
  if (error instanceof CampaignInputError) {
    return NextResponse.json(
      { error: { code: 'INVALID_CAMPAIGN_INPUT', message: error.message } },
      { status: 400 },
    )
  }
  if (error instanceof CampaignDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 403 },
    )
  }
  return NextResponse.json(
    { error: { code: 'CAMPAIGN_OPERATION_FAILED', message: 'Campaign operation failed.' } },
    { status: 500 },
  )
}

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
        { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found.' } },
        { status: 404 },
      )
    }
    return NextResponse.json({ campaign })
  } catch (error) {
    return errorResponse(error)
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
        { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found.' } },
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
    return errorResponse(error)
  }
}
