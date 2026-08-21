import { NextResponse } from 'next/server'
import { AuthDomainError, requireAuthenticatedUser } from '@/server/auth'
import {
  EntryPreferenceDomainError,
  parseEntryUseInput,
  recordCharacterEntryUse,
  recordPortableCharacterEntryUse,
  recordWeaverEntryUse,
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
        code: 'ENTRY_USE_FAILED',
        message: 'Entry use could not be recorded.',
      },
    },
    { status: 500 },
  )
}

export async function POST(request: Request) {
  try {
    const [user, input] = await Promise.all([
      requireAuthenticatedUser(request.headers),
      request.json().then(parseEntryUseInput),
    ])

    if (input.kind === 'CHARACTER') {
      await recordCharacterEntryUse({
        userId: user.id,
        worldCharacterId: input.worldCharacterId,
        campaignId: input.campaignId,
      })
    } else if (input.kind === 'PORTABLE_CHARACTER') {
      await recordPortableCharacterEntryUse({
        userId: user.id,
        characterId: input.characterId,
      })
    } else {
      await recordWeaverEntryUse({
        userId: user.id,
        worldId: input.worldId,
        campaignId: input.campaignId,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
