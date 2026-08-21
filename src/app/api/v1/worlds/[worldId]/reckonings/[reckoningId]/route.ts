import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import { worldEventService } from '@/server/world-events'
import { worldEventApiErrorResponse } from '../../_lib/world-event-error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; reckoningId: string }>
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId, reckoningId } = await context.params
    await worldEventService.deleteReckoning(worldId, user.id, reckoningId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return worldEventApiErrorResponse(error)
  }
}
