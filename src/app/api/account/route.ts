import { NextResponse } from 'next/server'
import {
  AccountLifecycleError,
  accountLifecycleService,
  AuthDomainError,
  requireAuthenticatedUser,
} from '@/server/auth'

export const runtime = 'nodejs'

function errorResponse(error: unknown) {
  if (error instanceof AuthDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 401 },
    )
  }

  if (error instanceof AccountLifecycleError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          blockers: error.blockers,
        },
      },
      { status: error.code === 'ACCOUNT_NOT_FOUND' ? 404 : 409 },
    )
  }

  return NextResponse.json(
    { error: { code: 'ACCOUNT_LIFECYCLE_FAILED', message: 'Account lifecycle operation failed.' } },
    { status: 500 },
  )
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const preflight = await accountLifecycleService.preflightAccountDeletion(
      user.id,
    )
    return NextResponse.json({ user, preflight })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const result = await accountLifecycleService.deleteAccount(user.id)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
