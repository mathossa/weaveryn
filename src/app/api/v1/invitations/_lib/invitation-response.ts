import { NextResponse } from 'next/server'
import { AuthDomainError } from '@/server/auth'
import { CampaignDomainError } from '@/server/campaigns'
import { MembershipInvitationDomainError } from '@/server/invitations'
import { WorldDomainError } from '@/server/worlds'

function invitationStatus(code: MembershipInvitationDomainError['code']) {
  if (code === 'INVITATION_INVALID_TOKEN') return 400
  if (code === 'INVITATION_NOT_FOUND') return 404
  return 409
}

function worldStatus(code: WorldDomainError['code']) {
  if (code === 'INVALID_WORLD_ROLE') return 400
  if (code === 'WORLD_NOT_FOUND' || code === 'USER_NOT_FOUND') return 404
  if (code === 'WORLD_MEMBERSHIP_ALREADY_EXISTS') return 409
  return 403
}

function campaignStatus(code: CampaignDomainError['code']) {
  if (code === 'INVALID_CAMPAIGN_ROLE') return 400
  if (code === 'CAMPAIGN_NOT_FOUND' || code === 'USER_NOT_FOUND') return 404
  if (code === 'CAMPAIGN_MEMBERSHIP_ALREADY_EXISTS') return 409
  return 403
}

export function invitationErrorResponse(error: unknown) {
  if (error instanceof AuthDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 401 },
    )
  }

  if (error instanceof MembershipInvitationDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: invitationStatus(error.code) },
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

  console.error('Unexpected invitation API failure.', error)
  return NextResponse.json(
    {
      error: {
        code: 'INVITATION_OPERATION_FAILED',
        message: 'Invitation operation failed.',
      },
    },
    { status: 500 },
  )
}
