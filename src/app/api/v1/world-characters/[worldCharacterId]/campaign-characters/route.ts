import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import { campaignCharacterService } from '@/server/campaign-characters'
import { parseAttachCampaignCharacterInput } from '@/server/characters'
import { characterApiErrorResponse } from '../../../characters/_lib/error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldCharacterId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const [{ worldCharacterId }, user, input] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json().then(parseAttachCampaignCharacterInput),
    ])
    const campaignCharacter = await campaignCharacterService.createCampaignCharacter({
      actorUserId: user.id,
      worldCharacterId,
      campaignId: input.campaignId,
    })
    return NextResponse.json({ campaignCharacter }, { status: 201 })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}
