import { NextResponse } from 'next/server'
import { AuthDomainError } from '@/server/auth'
import {
  WorldEventDomainError,
  WorldEventInputError,
} from '@/server/world-events'
import { WorldDomainError } from '@/server/worlds'

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export function worldEventApiErrorResponse(error: unknown) {
  if (error instanceof AuthDomainError) {
    return jsonError(error.code, error.message, 401)
  }
  if (error instanceof WorldEventInputError) {
    return jsonError('INVALID_WORLD_EVENT_INPUT', error.message, 400)
  }
  if (error instanceof WorldEventDomainError) {
    const status =
      error.code === 'WORLD_EVENT_NOT_FOUND' ||
      error.code === 'WORLD_TIMELINE_NOT_FOUND' ||
      error.code === 'WORLD_RECKONING_NOT_FOUND'
        ? 404
        : error.code === 'WORLD_RECKONING_IN_USE'
          ? 409
          : 400
    return jsonError(error.code, error.message, status)
  }
  if (error instanceof WorldDomainError) {
    return jsonError(
      error.code,
      error.message,
      error.code === 'WORLD_NOT_FOUND' ? 404 : 403,
    )
  }
  return jsonError(
    'WORLD_EVENT_OPERATION_FAILED',
    'World history operation failed.',
    500,
  )
}
