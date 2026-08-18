import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  parseCreateWorldEntityInput,
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
    const campaignId = new URL(request.url).searchParams.get('campaign') ?? undefined
    const [entities, entityTypes] = await Promise.all([
      worldEntityService.listEntities(worldId, user.id),
      worldEntityService.listEntityTypes(worldId, user.id, campaignId),
    ])
    return NextResponse.json({ entities, entityTypes })
  } catch (error) {
    return worldEntityApiErrorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId } = await context.params
    const input = parseCreateWorldEntityInput(await request.json())
    const entity = await worldEntityService.createEntity({
      actorUserId: user.id,
      worldId,
      ...input,
    })
    return NextResponse.json({ entity }, { status: 201 })
  } catch (error) {
    return worldEntityApiErrorResponse(error)
  }
}
