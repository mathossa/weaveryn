import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  characterService,
  getWorldCharacterOverview,
  mergeWorldCharacterProfile,
  parseUpdateWorldCharacterInput,
} from '@/server/characters'
import { characterApiErrorResponse } from '../../characters/_lib/error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldCharacterId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const [{ worldCharacterId }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    const worldCharacter = await getWorldCharacterOverview(
      worldCharacterId,
      user.id,
    )
    if (!worldCharacter) {
      return NextResponse.json(
        {
          error: {
            code: 'WORLD_CHARACTER_NOT_FOUND',
            message: 'WorldCharacter not found.',
          },
        },
        { status: 404 },
      )
    }
    return NextResponse.json({ worldCharacter })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const [{ worldCharacterId }, user, input] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
      request.json().then(parseUpdateWorldCharacterInput),
    ])

    const current = input.profile
      ? await characterService.loadWorldCharacter(worldCharacterId, user.id)
      : null

    const worldCharacter = await characterService.updateWorldCharacter(
      worldCharacterId,
      user.id,
      {
        ...(input.nameOverride !== undefined
          ? { nameOverride: input.nameOverride }
          : {}),
        ...(input.profile && current
          ? { worldData: mergeWorldCharacterProfile(current.worldData, input.profile) }
          : {}),
      },
    )
    return NextResponse.json({ worldCharacter })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const [{ worldCharacterId }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])
    await characterService.deleteWorldCharacter(worldCharacterId, user.id)
    return new Response(null, { status: 204 })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}
