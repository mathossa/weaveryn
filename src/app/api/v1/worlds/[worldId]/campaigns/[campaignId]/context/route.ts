import { NextResponse } from 'next/server'
import { AuthDomainError, requireAuthenticatedUser } from '@/server/auth'
import {
  CampaignDomainError,
  CampaignInputError,
  campaignContextService,
  getCampaignOverview,
  parseCampaignContextUpdateInput,
} from '@/server/campaigns'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; campaignId: string }>
}

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
    const status = error.code === 'CAMPAIGN_LOCATION_INVALID' ? 400 : 403
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status },
    )
  }
  console.error('Unexpected Campaign context API failure.', error)
  return NextResponse.json(
    {
      error: {
        code: 'CAMPAIGN_CONTEXT_OPERATION_FAILED',
        message: 'Campaign context could not be updated.',
      },
    },
    { status: 500 },
  )
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const [{ worldId, campaignId }, user, input] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json().then(parseCampaignContextUpdateInput),
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
    const updated = await campaignContextService.update(
      campaign.id,
      user.id,
      input,
    )
    return NextResponse.json({ context: updated })
  } catch (error) {
    return errorResponse(error)
  }
}
