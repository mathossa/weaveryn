import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  getWorldTimelineWorkspace,
  parseCreateWorldReckoningInput,
  worldEventService,
} from '@/server/world-events'
import { worldEventApiErrorResponse } from '../_lib/world-event-error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId } = await context.params
    const workspace = await getWorldTimelineWorkspace(worldId, user.id)
    return NextResponse.json({ reckonings: workspace?.reckonings ?? [] })
  } catch (error) {
    return worldEventApiErrorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId } = await context.params
    const input = parseCreateWorldReckoningInput(await request.json())
    const reckoning = await worldEventService.createReckoning({
      actorUserId: user.id,
      worldId,
      ...input,
    })
    return NextResponse.json({ reckoning }, { status: 201 })
  } catch (error) {
    return worldEventApiErrorResponse(error)
  }
}
