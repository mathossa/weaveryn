import { NextResponse } from 'next/server'
import { AuthDomainError } from '@/server/auth'
import { CampaignDomainError } from '@/server/campaigns'
import { WorldDomainError } from '@/server/worlds'

function worldStatus(code: WorldDomainError['code']) {
  if (code === 'INVALID_WORLD_ROLE') return 400
  if (code === 'WORLD_NOT_FOUND' || code === 'USER_NOT_FOUND') return 404
  if (code === 'WORLD_MEMBERSHIP_NOT_FOUND') return 404
  if (code === 'WORLD_MEMBERSHIP_ALREADY_EXISTS') return 409
  return 403
}

function campaignStatus(code: CampaignDomainError['code']) {
  if (
    code === 'INVALID_CAMPAIGN_ROLE' ||
    code === 'INVALID_CAMPAIGN_CAPABILITY'
  )
    return 400
  if (code === 'CAMPAIGN_NOT_FOUND' || code === 'USER_NOT_FOUND') return 404
  if (code === 'CAMPAIGN_MEMBERSHIP_NOT_FOUND') return 404
  if (
    code === 'CAMPAIGN_MEMBERSHIP_ALREADY_EXISTS' ||
    code === 'CAMPAIGN_MEMBERSHIP_HAS_ACTIVE_CHARACTER' ||
    code === 'CAMPAIGN_CAPABILITY_REQUIRES_PLAYER'
  ) {
    return 409
  }
  return 403
}

export function membershipErrorResponse(error: unknown) {
  if (error instanceof AuthDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 401 },
    )
  }

  if (error instanceof WorldDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: worldStatus(error.code) },
    )
  }

  if (error instanceof CampaignDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: campaignStatus(error.code) },
    )
  }

  console.error('Unexpected membership API failure.', error)
  return NextResponse.json(
    {
      error: {
        code: 'MEMBERSHIP_OPERATION_FAILED',
        message: 'Membership operation failed.',
      },
    },
    { status: 500 },
  )
}
