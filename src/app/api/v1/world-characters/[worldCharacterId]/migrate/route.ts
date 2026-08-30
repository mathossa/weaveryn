import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import { CharacterInputError, characterService } from '@/server/characters'
import { characterApiErrorResponse } from '../../../characters/_lib/error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldCharacterId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const [{ worldCharacterId }, user, body] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json() as Promise<unknown>,
    ])

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new CharacterInputError('Character move input must be an object.')
    }
    const targetWorldId = (body as Record<string, unknown>).targetWorldId
    if (typeof targetWorldId !== 'string' || !targetWorldId.trim()) {
      throw new CharacterInputError('Target World is required.')
    }

    const worldCharacter = await characterService.migrateWorldCharacter({
      actorUserId: user.id,
      worldCharacterId,
      targetWorldId: targetWorldId.trim(),
    })
    return NextResponse.json({ worldCharacter })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}
