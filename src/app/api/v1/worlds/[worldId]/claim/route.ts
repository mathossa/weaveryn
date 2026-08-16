import { NextResponse } from 'next/server'
import { AuthDomainError, requireAuthenticatedUser } from '@/server/auth'
import {
  WorldDomainError,
  claimOrphanedWorld,
} from '@/server/worlds'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId } = await context.params
    const world = await claimOrphanedWorld({ worldId, claimantId: user.id })
    return NextResponse.json({ world })
  } catch (error) {
    if (error instanceof AuthDomainError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 401 },
      )
    }
    if (error instanceof WorldDomainError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.code === 'WORLD_NOT_FOUND' ? 404 : 409 },
      )
    }
    return NextResponse.json(
      { error: { code: 'WORLD_CLAIM_FAILED', message: 'World claim failed.' } },
      { status: 500 },
    )
  }
}
