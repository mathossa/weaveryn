import { NextResponse } from 'next/server'
import { AuthDomainError, requireAuthenticatedUser } from '@/server/auth'
import {
  WorldDomainError,
  WorldInputError,
  getWorldOverview,
  parseWorldFormInput,
  worldService,
} from '@/server/worlds'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string }>
}

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
  if (error instanceof WorldDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.code === 'WORLD_NOT_FOUND' ? 404 : 403 },
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

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId } = await context.params
    const world = await getWorldOverview(worldId, user.id)
    if (!world) {
      return NextResponse.json(
        { error: { code: 'WORLD_NOT_FOUND', message: 'World not found.' } },
        { status: 404 },
      )
    }
    return NextResponse.json({ world })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId } = await context.params
    const input = parseWorldFormInput(await request.json())
    const world = await worldService.updateWorld(worldId, user.id, input)
    return NextResponse.json({ world })
  } catch (error) {
    return errorResponse(error)
  }
}
