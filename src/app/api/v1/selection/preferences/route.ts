import { NextResponse } from 'next/server'
import { AuthDomainError, requireAuthenticatedUser } from '@/server/auth'
import {
  EntryPreferenceDomainError,
  parseEntryPinInput,
  setCharacterEntryPinned,
  setPortableCharacterEntryPinned,
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
      {
        status: error.code === 'ENTRY_PREFERENCE_INVALID' ? 400 : 404,
      },
    )
  }

  return NextResponse.json(
    {
      error: {
        code: 'ENTRY_PREFERENCE_FAILED',
        message: 'Entry preference update failed.',
      },
    },
    { status: 500 },
  )
}

export async function PATCH(request: Request) {
  try {
    const [user, input] = await Promise.all([
      requireAuthenticatedUser(request.headers),
      request.json().then(parseEntryPinInput),
    ])
    const preference =
      input.kind === 'PORTABLE_CHARACTER'
        ? await setPortableCharacterEntryPinned({
            userId: user.id,
            characterId: input.characterId,
            pinned: input.pinned,
          })
        : await setCharacterEntryPinned({
            userId: user.id,
            worldCharacterId: input.worldCharacterId,
            campaignId: input.campaignId,
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
