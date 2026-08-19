import { NextResponse } from 'next/server'
import { AuthDomainError } from '@/server/auth'
import {
  WorldEntityDomainError,
  WorldEntityInputError,
} from '@/server/world-entities'
import { WorldDomainError } from '@/server/worlds'

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export function worldEntityApiErrorResponse(error: unknown) {
  if (error instanceof AuthDomainError) {
    return jsonError(error.code, error.message, 401)
  }
  if (error instanceof WorldEntityInputError) {
    return jsonError('INVALID_WORLD_ENTITY_INPUT', error.message, 400)
  }
  if (error instanceof WorldEntityDomainError) {
    const status =
      error.code === 'WORLD_ENTITY_NOT_FOUND' ||
      error.code === 'ENTITY_RELATIONSHIP_NOT_FOUND' ||
      error.code === 'WORLD_ENTITY_TYPE_NOT_FOUND'
        ? 404
        : error.code === 'WORLD_ENTITY_TYPE_IN_USE' ||
            error.code === 'WORLD_ENTITY_CHARACTER_MANAGED'
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
    'WORLD_ENTITY_OPERATION_FAILED',
    'World entity operation failed.',
    500,
  )
}
