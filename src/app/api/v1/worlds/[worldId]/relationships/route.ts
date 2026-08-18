import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  parseCreateEntityRelationshipInput,
  worldEntityService,
} from '@/server/world-entities'
import { worldEntityApiErrorResponse } from '../_lib/world-entity-error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId } = await context.params
    const relationships = await worldEntityService.listRelationships(worldId, user.id)
    return NextResponse.json({ relationships })
  } catch (error) {
    return worldEntityApiErrorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId } = await context.params
    const input = parseCreateEntityRelationshipInput(await request.json())
    const relationship = await worldEntityService.createRelationship({
      actorUserId: user.id,
      worldId,
      ...input,
    })
    return NextResponse.json({ relationship }, { status: 201 })
  } catch (error) {
    return worldEntityApiErrorResponse(error)
  }
}
