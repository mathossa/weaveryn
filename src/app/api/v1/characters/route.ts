import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  characterService,
  listOwnedCharacterChoices,
  parseCreateCharacterInput,
} from '@/server/characters'
import { characterApiErrorResponse } from './_lib/error-response'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    return NextResponse.json({
      characters: await listOwnedCharacterChoices(user.id),
    })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const input = parseCreateCharacterInput(await request.json())
    const character = await characterService.createCharacter({
      ownerUserId: user.id,
      name: input.name,
      coreData: {
        description: input.description ?? null,
        ancestry: input.ancestry ?? null,
      },
    })
    return NextResponse.json({ character }, { status: 201 })
  } catch (error) {
    return characterApiErrorResponse(error)
  }
}
