import { NextResponse } from 'next/server'
import { AuthDomainError } from '@/server/auth'
import { CampaignCharacterDomainError } from '@/server/campaign-characters'
import { CharacterDomainError, CharacterInputError } from '@/server/characters'
import { WorldDomainError } from '@/server/worlds'

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export function characterApiErrorResponse(error: unknown) {
  if (error instanceof AuthDomainError) {
    return jsonError(error.code, error.message, 401)
  }
  if (error instanceof CharacterInputError) {
    return jsonError('INVALID_CHARACTER_INPUT', error.message, 400)
  }
  if (error instanceof CharacterDomainError) {
    const status =
      error.code === 'CHARACTER_PERMISSION_DENIED'
        ? 403
        : error.code === 'WORLD_CHARACTER_ALREADY_EXISTS' ||
            error.code === 'WORLD_CHARACTER_HAS_CAMPAIGN_PARTICIPATION'
          ? 409
          : 404
    return jsonError(error.code, error.message, status)
  }
  if (error instanceof WorldDomainError) {
    const status = error.code === 'WORLD_NOT_FOUND' ? 404 : 403
    return jsonError(error.code, error.message, status)
  }
  if (error instanceof CampaignCharacterDomainError) {
    const status =
      error.code === 'CAMPAIGN_CHARACTER_ALREADY_EXISTS'
        ? 409
        : error.code.endsWith('NOT_FOUND')
          ? 404
          : error.code === 'CAMPAIGN_CHARACTER_CROSS_WORLD'
            ? 400
            : 403
    return jsonError(error.code, error.message, status)
  }

  return jsonError(
    'CHARACTER_OPERATION_FAILED',
    'Character operation failed.',
    500,
  )
}
