import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import { deleteWorldEntityType } from '@/server/world-entities'
import { worldEntityApiErrorResponse } from '../../_lib/world-entity-error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; typeId: string }>
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId, typeId } = await context.params
    await deleteWorldEntityType(worldId, user.id, typeId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return worldEntityApiErrorResponse(error)
  }
}
