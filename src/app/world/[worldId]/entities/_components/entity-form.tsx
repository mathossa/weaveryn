'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { uiAssets } from '@/lib/ui-assets'
import type {
  SimpleEntityFieldValue,
  WorldEntityTypeChoice,
  WorldEntityUiRecord,
} from '@/server/world-entities'
import styles from '../entity.module.css'
import { ImageFocusPicker } from './image-focus-picker'
import { RelationshipTypeInput } from './relationship-type-input'
import { VisibilityFields, type VisibilityValue } from './visibility-fields'

type FieldKind = 'text' | 'number' | 'boolean'

interface EditableField {
  id: string
  key: string
  kind: FieldKind
  value: string | boolean
}

interface InitialRelationshipDraft {
  id: string
  targetEntityId: string
  relationshipType: string
  label: string
}

function fieldKind(value: SimpleEntityFieldValue): FieldKind {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'text'
}

function initialFields(
  data: Record<string, SimpleEntityFieldValue>,
): EditableField[] {
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

function makeRelationship(
  entities: WorldEntityUiRecord[],
  relationshipTypes: string[],
): InitialRelationshipDraft {
  return {
    id: `relationship-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    targetEntityId: entities[0]?.id ?? '',
    relationshipType: relationshipTypes[0] ?? '',
    label: '',
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
  entities,
  relationshipTypes,
  campaigns,
  visibilityUsers,
  initialEntity,
}: {
  mode: 'create' | 'edit'
  worldId: string
  contextCampaignId?: string
  entityTypes: WorldEntityTypeChoice[]
  entities: WorldEntityUiRecord[]
  relationshipTypes: string[]
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
      : (entityTypes[0]?.value ?? '__custom__'),
  )
  const [customType, setCustomType] = useState(
    initialEntity && !knownInitialType ? initialEntity.type : '',
  )
  const [name, setName] = useState(initialEntity?.name ?? '')
  const [description, setDescription] = useState(
    initialEntity?.description ?? '',
  )
  const [image, setImage] = useState(initialEntity?.image ?? '')
  const [imageFocusX, setImageFocusX] = useState(
    initialEntity?.imageFocusX ?? 50,
  )
  const [imageFocusY, setImageFocusY] = useState(
    initialEntity?.imageFocusY ?? 50,
  )
  const [fields, setFields] = useState<EditableField[]>(
    initialFields(initialEntity?.data ?? {}),
  )
  const [initialRelationships, setInitialRelationships] = useState<
    InitialRelationshipDraft[]
  >([])
  const [visibility, setVisibility] = useState<VisibilityValue>({
    scope:
      initialEntity?.visibilityScope ??
      (contextCampaignId ? 'CAMPAIGN' : 'WORLD'),
    campaignId: initialEntity?.visibilityCampaignId ?? contextCampaignId ?? '',
    userId: initialEntity?.visibilityUserId ?? '',
  })
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const entityType = useMemo(
    () => (typeChoice === '__custom__' ? customType.trim() : typeChoice),
    [customType, typeChoice],
  )
  const previewImage = image.trim() || uiAssets.backgrounds.entityBanner.src

  function updateField(id: string, patch: Partial<EditableField>) {
    setFields((current) =>
      current.map((field) =>
        field.id === id ? { ...field, ...patch } : field,
      ),
    )
  }

  function updateRelationship(
    id: string,
    patch: Partial<InitialRelationshipDraft>,
  ) {
    setInitialRelationships((current) =>
      current.map((relationship) =>
        relationship.id === id ? { ...relationship, ...patch } : relationship,
      ),
    )
  }

  function structuredData() {
    const data: Record<string, SimpleEntityFieldValue> = {}
    for (const field of fields) {
      const key = field.key.trim()
      if (!key) continue
      if (field.kind === 'boolean') data[key] = Boolean(field.value)
      else if (field.kind === 'number') data[key] = Number(field.value)
      else data[key] = String(field.value)
    }
    return data
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!entityType) {
      setError('Choose or enter an entity type.')
      return
    }
    if (
      initialRelationships.some(
        (relationship) =>
          !relationship.targetEntityId || !relationship.relationshipType.trim(),
      )
    ) {
      setError(
        'Every connection needs another entity and a connection description.',
      )
      return
    }

    setPending(true)
    setSaved(false)
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
          imageFocusX,
          imageFocusY,
          data: structuredData(),
          ...(contextCampaignId ? { contextCampaignId } : {}),
          visibility: visibilityPayload(visibility),
          ...(mode === 'create'
            ? {
                initialRelationships: initialRelationships.map(
                  (relationship) => ({
                    targetEntityId: relationship.targetEntityId,
                    relationshipType: relationship.relationshipType,
                    label: relationship.label,
                  }),
                ),
              }
            : {}),
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

    if (mode === 'edit') {
      setPending(false)
      setSaved(true)
      router.refresh()
      return
    }

    router.replace(`/world/${worldId}/entities/${entityId}${query}`)
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
              <option
                value={choice.value}
                key={`${choice.scope}:${choice.value}`}
              >
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

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Image focus</h2>
            <p>
              Click the important point on the full image. The picker no longer
              moves the picture underneath your cursor; the card and detail
              crops below show the result.
            </p>
          </div>
        </div>
        <ImageFocusPicker
          src={previewImage}
          x={imageFocusX}
          y={imageFocusY}
          onChange={({ x, y }) => {
            setImageFocusX(x)
            setImageFocusY(y)
          }}
        />
        <div className={styles.focusControls}>
          <label className={styles.field}>
            <span>Horizontal focus · {imageFocusX}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={imageFocusX}
              onChange={(event) => setImageFocusX(Number(event.target.value))}
            />
          </label>
          <label className={styles.field}>
            <span>Vertical focus · {imageFocusY}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={imageFocusY}
              onChange={(event) => setImageFocusY(Number(event.target.value))}
            />
          </label>
        </div>
      </section>

      <label className={styles.field}>
        <span>Description</span>
        <textarea
          rows={4}
          maxLength={10000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      {mode === 'create' ? (
        <section className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Connections</h2>
              <p>
                Optional. Connect this new entity to things that already exist
                by building a simple sentence.
              </p>
            </div>
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={entities.length === 0}
              onClick={() =>
                setInitialRelationships((current) => [
                  ...current,
                  makeRelationship(entities, relationshipTypes),
                ])
              }
            >
              Add connection
            </button>
          </div>
          {entities.length === 0 ? (
            <p className={styles.helpText}>
              There are no existing visible entities to connect to yet.
            </p>
          ) : initialRelationships.length === 0 ? (
            <p className={styles.helpText}>No connections added yet.</p>
          ) : (
            <div className={styles.initialRelationships}>
              {initialRelationships.map((relationship) => (
                <div className={styles.panel} key={relationship.id}>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <span>This entity</span>
                      <strong>{name.trim() || 'This entity'}</strong>
                    </div>
                    <RelationshipTypeInput
                      value={relationship.relationshipType}
                      onChange={(relationshipType) =>
                        updateRelationship(relationship.id, {
                          relationshipType,
                        })
                      }
                      choices={relationshipTypes}
                    />
                    <label className={styles.field}>
                      <span>Connect to</span>
                      <select
                        required
                        value={relationship.targetEntityId}
                        onChange={(event) =>
                          updateRelationship(relationship.id, {
                            targetEntityId: event.target.value,
                          })
                        }
                      >
                        {entities.map((entity) => (
                          <option key={entity.id} value={entity.id}>
                            {entity.name} · {entity.type}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <details>
                    <summary>More options</summary>
                    <label className={styles.field}>
                      <span>Note (optional)</span>
                      <input
                        maxLength={240}
                        value={relationship.label}
                        onChange={(event) =>
                          updateRelationship(relationship.id, {
                            label: event.target.value,
                          })
                        }
                        placeholder="Extra context for this connection"
                      />
                    </label>
                  </details>
                  <div className={styles.formActions}>
                    <button
                      className={styles.linkButton}
                      type="button"
                      onClick={() =>
                        setInitialRelationships((current) =>
                          current.filter((item) => item.id !== relationship.id),
                        )
                      }
                    >
                      Remove connection
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Structured custom fields</h2>
            <p>
              Simple text, number, and yes/no values. No raw JSON is exposed.
            </p>
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
      {saved ? (
        <p className={styles.helpText} role="status">
          Saved. The entity view is refreshing in the background.
        </p>
      ) : null}
      <div className={styles.formActions}>
        <button
          className={styles.primaryButton}
          disabled={pending}
          type="submit"
        >
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
