'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import styles from '../../campaign.module.css'

interface TransferTarget {
  userId: string
  username: string
  displayName: string | null
  role: string
}

interface OwnershipProps {
  worldId: string
  campaignId: string
  campaignName: string
  canTransferOwnership: boolean
  transferTargets: TransferTarget[]
}

interface LifecycleProps {
  worldId: string
  campaignId: string
  campaignName: string
  status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
  canEnd: boolean
  canArchive: boolean
}

type LifecycleAction = 'end' | 'archive'

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string }
  } | null
  return body?.error?.message ?? fallback
}

export function CampaignOwnershipTransferControl({
  worldId,
  campaignId,
  campaignName,
  canTransferOwnership,
  transferTargets,
}: OwnershipProps) {
  const router = useRouter()
  const [targetUserId, setTargetUserId] = useState(
    transferTargets[0]?.userId ?? '',
  )
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const target = useMemo(
    () => transferTargets.find((value) => value.userId === targetUserId),
    [targetUserId, transferTargets],
  )

  async function transferOwnership() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/v1/worlds/${encodeURIComponent(worldId)}/campaigns/${encodeURIComponent(campaignId)}/transfer`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ targetUserId }),
        },
      )
      if (!response.ok) {
        setError(
          await responseError(response, 'Could not transfer this Campaign.'),
        )
        return
      }
      setConfirming(false)
      router.refresh()
    } catch {
      setError('Could not transfer this Campaign.')
    } finally {
      setPending(false)
    }
  }

  if (!canTransferOwnership) return null

  return (
    <div className={styles.lifecycleControls}>
      <div className={styles.lifecycleAction}>
        <div className={styles.field}>
          <label htmlFor="campaign-transfer-target">New owner</label>
          <select
            id="campaign-transfer-target"
            value={targetUserId}
            disabled={pending || transferTargets.length === 0}
            onChange={(event) => setTargetUserId(event.target.value)}
          >
            {transferTargets.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName ?? `@${member.username}`} · {member.role}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || !target}
          onClick={() => {
            setError(null)
            setConfirming(true)
          }}
        >
          Transfer ownership
        </Button>
        {transferTargets.length === 0 ? (
          <p className={styles.meta}>
            Add a Campaign member before transferring ownership.
          </p>
        ) : null}
      </div>

      {confirming ? (
        <div
          className={styles.lifecycleConfirm}
          role="group"
          aria-label="Transfer Campaign confirmation"
        >
          <strong>
            Transfer {campaignName} to{' '}
            {target?.displayName ??
              (target ? `@${target.username}` : 'this member')}
            ?
          </strong>
          <p>
            The selected member becomes the Campaign owner and is promoted to
            Weaver. Your existing Campaign membership is preserved.
          </p>
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => void transferOwnership()}
            >
              {pending ? 'Working…' : 'Confirm transfer'}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function CampaignLifecycleControls({
  worldId,
  campaignId,
  campaignName,
  status,
  canEnd,
  canArchive,
}: LifecycleProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState<LifecycleAction | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endpoint = `/api/v1/worlds/${encodeURIComponent(worldId)}/campaigns/${encodeURIComponent(campaignId)}`

  async function perform(action: LifecycleAction) {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`${endpoint}/${action}`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!response.ok) {
        setError(
          await responseError(response, `Could not ${action} this Campaign.`),
        )
        return
      }
      setConfirming(null)
      router.refresh()
    } catch {
      setError(`Could not ${action} this Campaign.`)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.lifecycleControls}>
      <p>
        <strong>Status:</strong> {status}
      </p>

      {status === 'ARCHIVED' ? (
        <div className={styles.notice}>
          This Campaign is historical and read-only. It can be preserved with an
          immutable World snapshot if the World is later deleted.
        </div>
      ) : null}

      {canEnd ? (
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => {
            setError(null)
            setConfirming('end')
          }}
        >
          End Campaign
        </Button>
      ) : null}

      {canArchive ? (
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => {
            setError(null)
            setConfirming('archive')
          }}
        >
          Archive Campaign
        </Button>
      ) : null}

      {confirming ? (
        <div
          className={styles.lifecycleConfirm}
          role="group"
          aria-label={`${confirming} Campaign confirmation`}
        >
          <strong>
            {confirming === 'end'
              ? `End ${campaignName}?`
              : `Archive ${campaignName}?`}
          </strong>
          <p>
            {confirming === 'end'
              ? 'The Campaign stops active play, but it still blocks World deletion until its owner explicitly archives or deletes it. Its World, timeline, memberships, Characters, and Campaign data remain intact.'
              : 'The Campaign becomes historical and read-only. It remains linked to the World until the explicit World deletion workflow snapshots and detaches it.'}
          </p>
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirming(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => void perform(confirming)}
            >
              {pending
                ? 'Working…'
                : confirming === 'end'
                  ? 'Confirm end Campaign'
                  : 'Confirm archive Campaign'}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function CampaignDeleteControl({
  worldId,
  campaignId,
  campaignName,
}: {
  worldId: string
  campaignId: string
  campaignName: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function deleteCampaign() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/v1/worlds/${encodeURIComponent(worldId)}/campaigns/${encodeURIComponent(campaignId)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      )
      if (!response.ok) {
        setError(
          await responseError(response, 'Could not delete this Campaign.'),
        )
        return
      }
      router.replace(`/world/${worldId}/campaign`)
    } catch {
      setError('Could not delete this Campaign.')
    } finally {
      setPending(false)
    }
  }

  if (!confirming) {
    return (
      <div className={styles.lifecycleAction}>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => {
            setError(null)
            setConfirming(true)
          }}
        >
          Delete Campaign
        </Button>
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    )
  }

  return (
    <div
      className={`${styles.lifecycleConfirm} ${styles.dangerConfirm}`}
      role="group"
      aria-label="Delete Campaign confirmation"
    >
      <strong>Delete {campaignName} permanently?</strong>
      <p>
        Campaign memberships, Campaign Characters, invitations, and other
        Campaign-scoped support records are removed. Portable Characters,
        WorldCharacters, the World, and independent World entity identity are
        not deleted.
      </p>
      <div className={styles.formActions}>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => void deleteCampaign()}
        >
          {pending ? 'Deleting…' : 'Confirm delete Campaign'}
        </Button>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
