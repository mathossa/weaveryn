import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  getWorldTimelineWorkspace,
  parseCreateWorldEventInput,
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
    if (!workspace) {
      return NextResponse.json(
        { error: { code: 'WORLD_NOT_FOUND', message: 'World not found.' } },
        { status: 404 },
      )
    }
    return NextResponse.json({
      timeline: workspace.timeline,
      events: workspace.events,
      reckonings: workspace.reckonings,
      canEditEvents: workspace.canEditEvents,
      canManageChronology: workspace.canManageChronology,
    })
  } catch (error) {
    return worldEventApiErrorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId } = await context.params
    const input = parseCreateWorldEventInput(await request.json())
    const event = await worldEventService.createEvent({
      actorUserId: user.id,
      worldId,
      ...input,
    })
    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    return worldEventApiErrorResponse(error)
  }
}
