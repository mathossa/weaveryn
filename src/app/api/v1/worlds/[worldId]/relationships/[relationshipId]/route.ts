import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import { worldEntityService } from '@/server/world-entities'
import { worldEntityApiErrorResponse } from '../../_lib/world-entity-error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; relationshipId: string }>
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId, relationshipId } = await context.params
    await worldEntityService.deleteRelationship(
      worldId,
      user.id,
      relationshipId,
    )
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return worldEntityApiErrorResponse(error)
  }
}
