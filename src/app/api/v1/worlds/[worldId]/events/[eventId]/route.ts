import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import {
  getWorldTimelineWorkspace,
  parseUpdateWorldEventInput,
  worldEventService,
} from '@/server/world-events'
import { worldEventApiErrorResponse } from '../../_lib/world-event-error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string; eventId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId, eventId } = await context.params
    const workspace = await getWorldTimelineWorkspace(worldId, user.id)
    const event = workspace?.events.find(
      (candidate) => candidate.id === eventId,
    )
    if (!event) {
      return NextResponse.json(
        {
          error: {
            code: 'WORLD_EVENT_NOT_FOUND',
            message: 'World event not found.',
          },
        },
        { status: 404 },
      )
    }
    return NextResponse.json({ event })
  } catch (error) {
    return worldEventApiErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId, eventId } = await context.params
    const input = parseUpdateWorldEventInput(await request.json())
    const event = await worldEventService.updateEvent(
      worldId,
      user.id,
      eventId,
      input,
    )
    return NextResponse.json({ event })
  } catch (error) {
    return worldEventApiErrorResponse(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId, eventId } = await context.params
    await worldEventService.deleteEvent(worldId, user.id, eventId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return worldEventApiErrorResponse(error)
  }
}
