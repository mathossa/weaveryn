import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  characterService,
  getPortableCharacterOverview,
  parseUpdateCharacterInput,
} from '@/server/characters'
import { characterApiErrorResponse } from '../_lib/error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ characterId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const [{ characterId }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    const character = await getPortableCharacterOverview(characterId, user.id)
    if (!character) {
      return NextResponse.json(
        { error: { code: 'CHARACTER_NOT_FOUND', message: 'Character not found.' } },
        { status: 404 },
      )
    }
    return NextResponse.json({ character })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const [{ characterId }, user, input] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json().then(parseUpdateCharacterInput),
    ])
    const character = await characterService.updateCharacter(characterId, user.id, {
      name: input.name,
    })
    return NextResponse.json({ character })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}
