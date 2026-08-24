import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import { campaignService } from '@/server/campaigns'
import { campaignApiErrorResponse } from '../_lib/campaign-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; campaignId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId, campaignId } = await context.params
    const campaign = await campaignService.endCampaign({
      campaignId,
      worldId,
      actorUserId: user.id,
    })
    return NextResponse.json({ campaign })
  } catch (error) {
    return campaignApiErrorResponse(error)
  }
}
