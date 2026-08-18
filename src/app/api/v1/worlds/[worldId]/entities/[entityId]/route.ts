import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  parseUpdateWorldEntityInput,
  worldEntityService,
} from '@/server/world-entities'
import { worldEntityApiErrorResponse } from '../../_lib/world-entity-error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; entityId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId, entityId } = await context.params
    const entity = await worldEntityService.loadEntity(worldId, user.id, entityId)
    if (!entity) {
      return NextResponse.json(
        { error: { code: 'WORLD_ENTITY_NOT_FOUND', message: 'World entity not found.' } },
        { status: 404 },
      )
    }
    return NextResponse.json({ entity })
  } catch (error) {
    return worldEntityApiErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId, entityId } = await context.params
    const input = parseUpdateWorldEntityInput(await request.json())
    const entity = await worldEntityService.updateEntity(
      worldId,
      user.id,
      entityId,
      input,
    )
    return NextResponse.json({ entity })
  } catch (error) {
    return worldEntityApiErrorResponse(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId, entityId } = await context.params
    await worldEntityService.deleteEntity(worldId, user.id, entityId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return worldEntityApiErrorResponse(error)
  }
}
