import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  characterService,
  parseCreateWorldCharacterInput,
} from '@/server/characters'
import { characterApiErrorResponse } from '../../_lib/error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ characterId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const [{ characterId }, user, input] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json().then(parseCreateWorldCharacterInput),
    ])
    const worldCharacter = await characterService.createWorldCharacter({
      actorUserId: user.id,
      characterId,
      worldId: input.worldId,
      nameOverride: input.nameOverride,
    })
    return NextResponse.json({ worldCharacter }, { status: 201 })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}
