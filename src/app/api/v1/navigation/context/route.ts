import { NextResponse } from 'next/server'
import { AuthDomainError, requireAuthenticatedUser } from '@/server/auth'
import {
  ContextNavigationDomainError,
  listContextNavigationOptions,
  parseContextNavigationInput,
} from '@/server/navigation'

export const runtime = 'nodejs'

function errorResponse(error: unknown) {
  if (error instanceof AuthDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 401 },
    )
  }

  if (error instanceof ContextNavigationDomainError) {
    return NextResponse.json(
      {
        error: {
          code: 'CONTEXT_NAVIGATION_INVALID',
          message: error.message,
        },
      },
      { status: 400 },
    )
  }

  return NextResponse.json(
    {
      error: {
        code: 'CONTEXT_NAVIGATION_FAILED',
        message: 'Context choices could not be loaded.',
      },
    },
    { status: 500 },
  )
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const input = parseContextNavigationInput(new URL(request.url).searchParams)
    const options = await listContextNavigationOptions(user.id, input)

    return NextResponse.json(
      { options },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return errorResponse(error)
  }
}
