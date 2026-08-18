'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type {
  SimpleEntityFieldValue,
  WorldEntityTypeChoice,
  WorldEntityUiRecord,
} from '@/server/world-entities'
import styles from '../entity.module.css'
import {
  VisibilityFields,
  type VisibilityValue,
} from './visibility-fields'

type FieldKind = 'text' | 'number' | 'boolean'

interface EditableField {
  id: string
  key: string
  kind: FieldKind
  value: string | boolean
}

function fieldKind(value: SimpleEntityFieldValue): FieldKind {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'text'
}

function initialFields(data: Record<string, SimpleEntityFieldValue>): EditableField[] {
  return Object.entries(data).map(([key, value], index) => ({
    id: `${key}-${index}`,
    key,
    kind: fieldKind(value),
    value: typeof value === 'boolean' ? value : String(value),
  }))
}

function makeField(): EditableField {
  return {
    id: `field-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    key: '',
    kind: 'text',
    value: '',
  }
}

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

export function EntityForm({
  mode,
  worldId,
  contextCampaignId,
  entityTypes,
  campaigns,
  visibilityUsers,
  initialEntity,
}: {
  mode: 'create' | 'edit'
  worldId: string
  contextCampaignId?: string
  entityTypes: WorldEntityTypeChoice[]
  campaigns: { id: string; name: string }[]
  visibilityUsers: { id: string; label: string }[]
  initialEntity?: WorldEntityUiRecord
}) {
  const router = useRouter()
  const knownInitialType = initialEntity
    ? entityTypes.some((choice) => choice.value === initialEntity.type)
    : false
  const [typeChoice, setTypeChoice] = useState(
    initialEntity
      ? knownInitialType
        ? initialEntity.type
        : '__custom__'
      : entityTypes[0]?.value ?? '__custom__',
  )
  const [customType, setCustomType] = useState(
    initialEntity && !knownInitialType ? initialEntity.type : '',
  )
  const [name, setName] = useState(initialEntity?.name ?? '')
  const [description, setDescription] = useState(
    initialEntity?.description ?? '',
  )
  const [image, setImage] = useState(initialEntity?.image ?? '')
  const [fields, setFields] = useState<EditableField[]>(
    initialFields(initialEntity?.data ?? {}),
  )
  const [visibility, setVisibility] = useState<VisibilityValue>({
    scope:
      initialEntity?.visibilityScope ??
      (contextCampaignId ? 'CAMPAIGN' : 'WORLD'),
    campaignId:
      initialEntity?.visibilityCampaignId ?? contextCampaignId ?? '',
    userId: initialEntity?.visibilityUserId ?? '',
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const entityType = useMemo(
    () => (typeChoice === '__custom__' ? customType.trim() : typeChoice),
    [customType, typeChoice],
  )

  function updateField(id: string, patch: Partial<EditableField>) {
    setFields((current) =>
      current.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    )
  }

  function structuredData() {
    const data: Record<string, SimpleEntityFieldValue> = {}
    for (const field of fields) {
      const key = field.key.trim()
      if (!key) continue
      if (field.kind === 'boolean') {
        data[key] = Boolean(field.value)
      } else if (field.kind === 'number') {
        data[key] = Number(field.value)
      } else {
        data[key] = String(field.value)
      }
    }
    return data
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!entityType) {
      setError('Choose or enter an entity type.')
      return
    }

    setPending(true)
    setError(null)
    const response = await fetch(
      mode === 'create'
        ? `/api/v1/worlds/${worldId}/entities`
        : `/api/v1/worlds/${worldId}/entities/${initialEntity?.id}`,
      {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: entityType,
          name,
          description,
          image,
          data: structuredData(),
          ...(contextCampaignId ? { contextCampaignId } : {}),
          visibility: visibilityPayload(visibility),
        }),
      },
    )
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setError(result?.error?.message ?? 'Could not save World entity.')
      setPending(false)
      return
    }

    const entityId = result.entity.id as string
    const query = contextCampaignId ? `?campaign=${contextCampaignId}` : ''
    router.replace(`/world/${worldId}/entities/${entityId}${query}`)
    router.refresh()
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Type</span>
          <select
            value={typeChoice}
            onChange={(event) => setTypeChoice(event.target.value)}
          >
            {entityTypes.map((choice) => (
              <option value={choice.value} key={`${choice.scope}:${choice.value}`}>
                {choice.label}
                {choice.scope === 'CAMPAIGN' ? ' · Campaign' : ''}
              </option>
            ))}
            <option value="__custom__">Custom…</option>
          </select>
        </label>
        {typeChoice === '__custom__' ? (
          <label className={styles.field}>
            <span>Custom type</span>
            <input
              required
              maxLength={80}
              value={customType}
              onChange={(event) => setCustomType(event.target.value)}
              placeholder="e.g. Astral Beacon"
            />
          </label>
        ) : null}
        <label className={styles.field}>
          <span>Name</span>
          <input
            required
            maxLength={160}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Image URL (optional)</span>
          <input
            maxLength={2000}
            value={image}
            onChange={(event) => setImage(event.target.value)}
            placeholder="Default type artwork is used when empty"
          />
        </label>
      </div>

      <label className={styles.field}>
        <span>Description</span>
        <textarea
          rows={4}
          maxLength={10000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Structured custom fields</h2>
            <p>Simple text, number, and yes/no values. No raw JSON is exposed.</p>
          </div>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => setFields((current) => [...current, makeField()])}
          >
            Add field
          </button>
        </div>
        {fields.length === 0 ? (
          <p className={styles.helpText}>No custom fields yet.</p>
        ) : (
          <div className={styles.customFields}>
            {fields.map((field) => (
              <div className={styles.customFieldRow} key={field.id}>
                <input
                  aria-label="Custom field name"
                  maxLength={80}
                  value={field.key}
                  onChange={(event) =>
                    updateField(field.id, { key: event.target.value })
                  }
                  placeholder="Field name"
                />
                <select
                  aria-label="Custom field type"
                  value={field.kind}
                  onChange={(event) => {
                    const kind = event.target.value as FieldKind
                    updateField(field.id, {
                      kind,
                      value: kind === 'boolean' ? false : '',
                    })
                  }}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Yes / no</option>
                </select>
                {field.kind === 'boolean' ? (
                  <select
                    aria-label="Custom field value"
                    value={field.value ? 'true' : 'false'}
                    onChange={(event) =>
                      updateField(field.id, {
                        value: event.target.value === 'true',
                      })
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    aria-label="Custom field value"
                    type={field.kind === 'number' ? 'number' : 'text'}
                    value={String(field.value)}
                    onChange={(event) =>
                      updateField(field.id, { value: event.target.value })
                    }
                    placeholder="Value"
                  />
                )}
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label={`Remove ${field.key || 'custom field'}`}
                  onClick={() =>
                    setFields((current) =>
                      current.filter((choice) => choice.id !== field.id),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Audience</h2>
            <p>
              New entities default to {contextCampaignId ? 'Campaign' : 'World'}
              visibility in this context.
            </p>
          </div>
        </div>
        <VisibilityFields
          value={visibility}
          onChange={setVisibility}
          campaigns={campaigns}
          users={visibilityUsers}
        />
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.formActions}>
        <button className={styles.primaryButton} disabled={pending} type="submit">
          {pending
            ? 'Saving…'
            : mode === 'create'
              ? 'Create entity'
              : 'Save entity'}
        </button>
      </div>
    </form>
  )
}
