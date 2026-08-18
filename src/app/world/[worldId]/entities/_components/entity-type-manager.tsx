'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WorldEntityTypeChoice } from '@/server/world-entities'
import styles from '../entity.module.css'

export function EntityTypeManager({
  worldId,
  types,
}: {
  worldId: string
  types: WorldEntityTypeChoice[]
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const router = useRouter()
  const customTypes = types.filter((type) => type.scope !== 'BUILT_IN' && type.id)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function removeType(type: WorldEntityTypeChoice) {
    if (!type.id || (type.usageCount ?? 0) > 0) return
    setPendingId(type.id)
    setError(null)
    const response = await fetch(
      `/api/v1/worlds/${worldId}/entity-types/${type.id}`,
      { method: 'DELETE' },
    )
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setError(result?.error?.message ?? 'Could not delete custom entity type.')
      setPendingId(null)
      return
    }
    setPendingId(null)
    router.refresh()
  }

  return (
    <>
      <button
        className={styles.secondaryButton}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        Manage types
      </button>
      <dialog className={styles.typeDialog} ref={dialogRef}>
        <div className={styles.dialogHeader}>
          <div>
            <h2>Custom entity types</h2>
            <p>Built-in types remain available and cannot be removed.</p>
          </div>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="Close type manager"
            onClick={() => dialogRef.current?.close()}
          >
            ×
          </button>
        </div>
        {customTypes.length === 0 ? (
          <p className={styles.helpText}>No custom entity types in this context.</p>
        ) : (
          <div className={styles.typeList}>
            {customTypes.map((type) => {
              const usageCount = type.usageCount ?? 0
              return (
                <div className={styles.typeRow} key={type.id}>
                  <div>
                    <strong>{type.label}</strong>
                    <p className={styles.helpText}>
                      {type.scope === 'CAMPAIGN' ? 'Campaign type' : 'World type'} ·{' '}
                      {usageCount} {usageCount === 1 ? 'entity' : 'entities'}
                    </p>
                  </div>
                  <button
                    className={styles.dangerButton}
                    type="button"
                    disabled={usageCount > 0 || pendingId === type.id}
                    title={
                      usageCount > 0
                        ? 'Change or delete all entities using this type first.'
                        : 'Delete this custom type'
                    }
                    onClick={() => void removeType(type)}
                  >
                    {pendingId === type.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {error ? <p className={styles.error}>{error}</p> : null}
      </dialog>
    </>
  )
}
