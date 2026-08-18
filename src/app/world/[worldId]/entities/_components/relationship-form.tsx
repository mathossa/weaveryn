'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { WorldEntityUiRecord } from '@/server/world-entities'
import styles from '../entity.module.css'
import { RelationshipTypeInput } from './relationship-type-input'
import {
  VisibilityFields,
  type VisibilityValue,
} from './visibility-fields'

function visibilityPayload(value: VisibilityValue) {
  return {
    scope: value.scope,
    ...(value.scope === 'CAMPAIGN' || value.scope === 'GM'
      ? { campaignId: value.campaignId }
      : {}),
    ...(value.scope === 'PLAYER'
      ? {
          userId: value.userId,
          ...(value.campaignId ? { campaignId: value.campaignId } : {}),
        }
      : {}),
  }
}

export function RelationshipForm({
  worldId,
  sourceEntityId,
  entities,
  relationshipTypes,
  campaigns,
  visibilityUsers,
  contextCampaignId,
}: {
  worldId: string
  sourceEntityId: string
  entities: WorldEntityUiRecord[]
  relationshipTypes: string[]
  campaigns: { id: string; name: string }[]
  visibilityUsers: { id: string; label: string }[]
  contextCampaignId?: string
}) {
  const router = useRouter()
  const targets = entities.filter((entity) => entity.id !== sourceEntityId)
  const [targetEntityId, setTargetEntityId] = useState(targets[0]?.id ?? '')
  const [relationshipType, setRelationshipType] = useState(
    relationshipTypes[0] ?? '',
  )
  const [label, setLabel] = useState('')
  const [visibility, setVisibility] = useState<VisibilityValue>({
    scope: contextCampaignId ? 'CAMPAIGN' : 'WORLD',
    campaignId: contextCampaignId ?? '',
    userId: '',
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!targetEntityId || !relationshipType.trim()) return
    setPending(true)
    setError(null)

    const response = await fetch(`/api/v1/worlds/${worldId}/relationships`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sourceEntityId,
        targetEntityId,
        relationshipType,
        label,
        ...(contextCampaignId ? { contextCampaignId } : {}),
        visibility: visibilityPayload(visibility),
      }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setError(result?.error?.message ?? 'Could not create relationship.')
      setPending(false)
      return
    }

    setLabel('')
    setPending(false)
    router.refresh()
  }

  if (targets.length === 0) {
    return (
      <p className={styles.helpText}>
        Create another visible entity before adding a relationship.
      </p>
    )
  }

  return (
    <form className={styles.relationshipForm} onSubmit={submit}>
      <div className={styles.formGrid}>
        <RelationshipTypeInput
          value={relationshipType}
          onChange={setRelationshipType}
          choices={relationshipTypes}
        />
        <label className={styles.field}>
          <span>Target entity</span>
          <select
            required
            value={targetEntityId}
            onChange={(event) => setTargetEntityId(event.target.value)}
          >
            {targets.map((entity) => (
              <option value={entity.id} key={entity.id}>
                {entity.name} · {entity.type}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={styles.field}>
        <span>Label (optional)</span>
        <input
          maxLength={240}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Human-readable context"
        />
      </label>
      <VisibilityFields
        value={visibility}
        onChange={setVisibility}
        campaigns={campaigns}
        users={visibilityUsers}
      />
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.formActions}>
        <button className={styles.primaryButton} disabled={pending} type="submit">
          {pending ? 'Linking…' : 'Add relationship'}
        </button>
      </div>
    </form>
  )
}
