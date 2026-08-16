import { NextResponse } from 'next/server'
import { AuthDomainError, requireAuthenticatedUser } from '@/server/auth'
import {
  CampaignDomainError,
  CampaignInputError,
  campaignService,
  getWorldCampaignSelection,
  parseCampaignFormInput,
} from '@/server/campaigns'
import { WorldDomainError } from '@/server/worlds'

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
  if (
    error instanceof WorldDomainError ||
    error instanceof CampaignDomainError
  ) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 403 },
    )
  }
  return NextResponse.json(
    {
      error: {
        code: 'CAMPAIGN_OPERATION_FAILED',
        message: 'Campaign operation failed.',
      },
    },
    { status: 500 },
  )
}

interface RouteContext {
  params: Promise<{ worldId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const [{ worldId }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    const selection = await getWorldCampaignSelection(worldId, user.id)
    if (!selection) {
      return NextResponse.json(
        { error: { code: 'WORLD_NOT_FOUND', message: 'World not found.' } },
        { status: 404 },
      )
    }
    return NextResponse.json(selection)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const [{ worldId }, user, input] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json().then(parseCampaignFormInput),
    ])
    const campaign = await campaignService.createCampaign({
      creatorId: user.id,
      worldId,
      ...input,
    })
    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
