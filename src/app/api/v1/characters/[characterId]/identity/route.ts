import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  characterNotFound,
  characterService,
  parseCreateCharacterInput,
} from '@/server/characters'
import { characterApiErrorResponse } from '../../_lib/error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ characterId: string }>
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const [{ characterId }, user, input] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json().then(parseCreateCharacterInput),
    ])
    const current = await characterService.loadCharacter(characterId, user.id)
    if (!current) throw characterNotFound(characterId)

    const coreData = record(current.coreData)
    if (Object.hasOwn(input, 'description')) {
      coreData.description = input.description
    }
    if (Object.hasOwn(input, 'ancestry')) {
      coreData.ancestry = input.ancestry
    }

    const character = await characterService.updateCharacter(
      characterId,
      user.id,
      {
        name: input.name,
        coreData,
      },
    )
    return NextResponse.json({ character })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}
