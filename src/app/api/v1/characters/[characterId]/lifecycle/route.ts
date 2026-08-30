import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthenticatedUser } from '@/server/auth'
import { characterApiErrorResponse } from '../../_lib/error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ characterId: string }>
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const [{ characterId }, user] = await Promise.all([
      context.params,
      requireAuthenticatedUser(request.headers),
    ])

    const character = await prisma.character.findFirst({
      where: { id: characterId, ownerUserId: user.id },
      select: {
        id: true,
        name: true,
        worldCharacters: {
          select: { world: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!character) {
      return NextResponse.json(
        {
          error: {
            code: 'CHARACTER_NOT_FOUND',
            message: 'Character not found.',
          },
        },
        { status: 404 },
      )
    }

    if (character.worldCharacters.length > 0) {
      const worlds = character.worldCharacters
        .map((worldCharacter) => worldCharacter.world.name)
        .join(', ')
      return NextResponse.json(
        {
          error: {
            code: 'CHARACTER_HAS_WORLD_INCARNATIONS',
            message: `${character.name} still has a World incarnation in ${worlds}. Remove those incarnations before deleting the portable Character.`,
          },
        },
        { status: 409 },
      )
    }

    await prisma.character.delete({ where: { id: character.id } })
    return new Response(null, { status: 204 })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}
