'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface InviteAcceptButtonProps {
  token: string
}

interface AcceptedWorldInvitation {
  kind: 'WORLD'
  worldId: string
  role: 'ADMIN' | 'MEMBER' | 'VIEWER'
}

interface AcceptedCampaignInvitation {
  kind: 'CAMPAIGN'
  worldId: string
  campaignId: string
  role: 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'
}

type AcceptedInvitation = AcceptedWorldInvitation | AcceptedCampaignInvitation

type Feedback = { message: string } | null

function destinationForInvitation(invitation: AcceptedInvitation) {
  if (invitation.kind === 'WORLD') {
    return `/world/${invitation.worldId}`
  }

  if (invitation.role === 'PLAYER') {
    const query = new URLSearchParams({
      world: invitation.worldId,
      campaign: invitation.campaignId,
    })
    return `/character?${query.toString()}`
  }

  const campaignPath = `/world/${invitation.worldId}/campaign/${invitation.campaignId}`
  return invitation.role === 'GM' || invitation.role === 'ASSISTANT_GM'
    ? `${campaignPath}?mode=weaver`
    : campaignPath
}

export function InviteAcceptButton({ token }: InviteAcceptButtonProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function accept() {
    if (busy) return
    setBusy(true)
    setFeedback(null)

    try {
      const response = await fetch(`/api/v1/invitations/${token}`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      const body = (await response.json().catch(() => null)) as {
        accepted?: AcceptedInvitation
        error?: { message?: string }
      } | null

      if (!response.ok || !body?.accepted) {
        setFeedback({
          message:
            body?.error?.message ??
            'Unable to accept this invitation right now. Please try again.',
        })
        return
      }

      router.replace(destinationForInvitation(body.accepted))
      router.refresh()
    } catch {
      setFeedback({
        message:
          'Unable to accept this invitation right now. Please try again.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Button type="button" onClick={accept} disabled={busy}>
        {busy ? 'Joining…' : 'Accept invitation'}
      </Button>
      {feedback ? (
        <p role="alert" aria-live="polite">
          {feedback.message}
        </p>
      ) : null}
    </div>
  )
}
