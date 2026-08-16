import { NextResponse } from 'next/server'
import { AuthDomainError, requireAuthenticatedUser } from '@/server/auth'
import {
  WorldInputError,
  listWorldNavigationChoices,
  parseWorldFormInput,
  worldService,
} from '@/server/worlds'

export const runtime = 'nodejs'

function errorResponse(error: unknown) {
  if (error instanceof AuthDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 401 },
    )
  }

  if (error instanceof WorldInputError) {
    return NextResponse.json(
      { error: { code: 'INVALID_WORLD_INPUT', message: error.message } },
      { status: 400 },
    )
  }

  return NextResponse.json(
    {
      error: {
        code: 'WORLD_OPERATION_FAILED',
        message: 'World operation failed.',
      },
    },
    { status: 500 },
  )
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    return NextResponse.json({
      worlds: await listWorldNavigationChoices(user.id),
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const input = parseWorldFormInput(await request.json())
    const world = await worldService.createWorld({
      creatorId: user.id,
      name: input.name,
      description: input.description,
    })
    return NextResponse.json({ world }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
