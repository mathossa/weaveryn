import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/server/auth'
import { worldEntityService } from '@/server/world-entities'
import { worldEntityApiErrorResponse } from '../_lib/world-entity-error-response'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ worldId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const { worldId } = await context.params
    const campaignId =
      new URL(request.url).searchParams.get('campaign') ?? undefined
    const entityTypes = await worldEntityService.listEntityTypes(
      worldId,
      user.id,
      campaignId,
    )
    return NextResponse.json({ entityTypes })
  } catch (error) {
    return worldEntityApiErrorResponse(error)
  }
}
