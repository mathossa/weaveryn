import { NextResponse } from 'next/server'
import { AuthDomainError } from '@/server/auth'
import { CampaignDomainError, CampaignInputError } from '@/server/campaigns'

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

function campaignStatus(code: CampaignDomainError['code']) {
  if (code === 'CAMPAIGN_NOT_FOUND' || code === 'USER_NOT_FOUND') return 404
  if (
    code === 'CAMPAIGN_INVALID_STATUS_TRANSITION' ||
    code === 'CAMPAIGN_SAME_OWNER' ||
    code === 'CAMPAIGN_ARCHIVED_READ_ONLY' ||
    code === 'CAMPAIGN_STATE_CHANGED'
  ) {
    return 409
  }
  if (
    code === 'CAMPAIGN_LOCATION_INVALID' ||
    code === 'INVALID_CAMPAIGN_ROLE' ||
    code === 'INVALID_CAMPAIGN_CAPABILITY'
  ) {
    return 400
  }
  return 403
}

export function campaignApiErrorResponse(error: unknown) {
  if (error instanceof AuthDomainError) {
    return jsonError(error.code, error.message, 401)
  }
  if (error instanceof CampaignInputError) {
    return jsonError('INVALID_CAMPAIGN_INPUT', error.message, 400)
  }
  if (error instanceof SyntaxError) {
    return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400)
  }
  if (error instanceof CampaignDomainError) {
    return jsonError(error.code, error.message, campaignStatus(error.code))
  }

  console.error('Unexpected Campaign API failure.', error)
  return jsonError(
    'CAMPAIGN_OPERATION_FAILED',
    'Campaign operation failed.',
    500,
  )
}
