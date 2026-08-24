import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  campaignService,
  parseCampaignOwnershipTransferInput,
} from '@/server/campaigns'
import { campaignApiErrorResponse } from '../_lib/campaign-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; campaignId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const [{ worldId, campaignId }, input] = await Promise.all([
      context.params,
      request.json().then(parseCampaignOwnershipTransferInput),
    ])
    const campaign = await campaignService.transferOwnership({
      campaignId,
      worldId,
      actorUserId: user.id,
      targetUserId: input.targetUserId,
    })
    return NextResponse.json({ campaign })
  } catch (error) {
    return campaignApiErrorResponse(error)
  }
}
