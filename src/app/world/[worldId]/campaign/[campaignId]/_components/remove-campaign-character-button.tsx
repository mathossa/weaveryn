'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface RemoveCampaignCharacterButtonProps {
  campaignCharacterId: string
  characterName: string
}

export function RemoveCampaignCharacterButton({
  campaignCharacterId,
  characterName,
}: RemoveCampaignCharacterButtonProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function removeParticipation() {
    if (busy) return
    if (
      !window.confirm(
        `Remove ${characterName} from this Campaign? The Character and WorldCharacter remain intact.`,
      )
    ) {
      return
    }

    setBusy(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/v1/campaign-characters/${encodeURIComponent(campaignCharacterId)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      )
      const body =
        response.status === 204
          ? null
          : ((await response.json().catch(() => null)) as {
              error?: { message?: string }
            } | null)

      if (!response.ok) {
        setError(body?.error?.message ?? 'Unable to remove this participation.')
        return
      }

      router.refresh()
    } catch {
      setError('Unable to remove this participation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="danger"
        disabled={busy}
        onClick={removeParticipation}
      >
        {busy ? 'Removing…' : 'Remove participation'}
      </Button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  )
}
