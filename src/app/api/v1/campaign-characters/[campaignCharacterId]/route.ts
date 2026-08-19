import { requireAuthenticatedUser } from '@/server/auth'
import { campaignCharacterService } from '@/server/campaign-characters'
import { characterApiErrorResponse } from '../../characters/_lib/error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ campaignCharacterId: string }>
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const [{ campaignCharacterId }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    await campaignCharacterService.removeCampaignCharacter(
      campaignCharacterId,
      user.id,
    )
    return new Response(null, { status: 204 })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}
