import { NextResponse } from 'next/server'
import { AuthDomainError, requireAuthenticatedUser } from '@/server/auth'
import {
  EntryPreferenceDomainError,
  setWeaverCampaignEntryPinned,
  setWeaverWorldEntryPinned,
} from '@/server/selection'

export const runtime = 'nodejs'

function errorResponse(error: unknown) {
  if (error instanceof AuthDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 401 },
    )
  }

  if (error instanceof EntryPreferenceDomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.code === 'ENTRY_PREFERENCE_INVALID' ? 400 : 404 },
    )
  }

  return NextResponse.json(
    {
      error: {
        code: 'ENTRY_PREFERENCE_FAILED',
        message: 'Weaver preference update failed.',
      },
    },
    { status: 500 },
  )
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request.headers)
    const input = (await request.json()) as Record<string, unknown>

    if (
      typeof input.worldId !== 'string' ||
      input.worldId.length === 0 ||
      typeof input.pinned !== 'boolean'
    ) {
      throw new EntryPreferenceDomainError(
        'ENTRY_PREFERENCE_INVALID',
        'World and pinned state are required.',
      )
    }

    if (
      input.campaignId !== undefined &&
      input.campaignId !== null &&
      (typeof input.campaignId !== 'string' || input.campaignId.length === 0)
    ) {
      throw new EntryPreferenceDomainError(
        'ENTRY_PREFERENCE_INVALID',
        'Campaign ID must be a non-empty string when provided.',
      )
    }

    const preference =
      typeof input.campaignId === 'string'
        ? await setWeaverCampaignEntryPinned({
            userId: user.id,
            worldId: input.worldId,
            campaignId: input.campaignId,
            pinned: input.pinned,
          })
        : await setWeaverWorldEntryPinned({
            userId: user.id,
            worldId: input.worldId,
            pinned: input.pinned,
          })

    return NextResponse.json({
      preference: {
        entryKey: preference.entryKey,
        pinned: preference.pinned,
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
