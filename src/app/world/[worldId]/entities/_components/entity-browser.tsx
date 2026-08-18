'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { uiAssets } from '@/lib/ui-assets'
import type { WorldEntityUiRecord } from '@/server/world-entities'
import styles from '../entity.module.css'
import { FocalImage } from './focal-image'

function entityHref(worldId: string, entityId: string, campaignId?: string) {
  const query = campaignId ? `?campaign=${campaignId}` : ''
  return `/world/${worldId}/entities/${entityId}${query}`
}

export function EntityBrowser({
  worldId,
  campaignId,
  entities,
}: {
  worldId: string
  campaignId?: string
  entities: WorldEntityUiRecord[]
}) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('ALL')
  const types = useMemo(
    () => [...new Set(entities.map((entity) => entity.type))].sort(),
    [entities],
  )
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return entities.filter(
      (entity) =>
        (type === 'ALL' || entity.type === type) &&
        (!term ||
          entity.name.toLocaleLowerCase().includes(term) ||
          entity.type.toLocaleLowerCase().includes(term) ||
          entity.description?.toLocaleLowerCase().includes(term)),
    )
  }, [entities, search, type])

  return (
    <section className={styles.browser} aria-label="World entities">
      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, type, or description"
          />
        </label>
        <label className={styles.field}>
          <span>Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="ALL">All types</option>
            {types.map((choice) => (
              <option value={choice} key={choice}>
                {choice}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.resultCount}>
          {filtered.length} of {entities.length}
        </p>
      </div>

      <div className={styles.entityList}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {entities.length === 0
              ? 'No World entities are visible in this context yet.'
              : 'No entities match this search and filter.'}
          </div>
        ) : (
          filtered.map((entity) => (
            <Link
              className={styles.entityCard}
              href={entityHref(worldId, entity.id, campaignId)}
              key={entity.id}
            >
              <FocalImage
                className={styles.entityArt}
                src={entity.image || uiAssets.backgrounds.entityBanner.src}
                focusX={entity.imageFocusX}
                focusY={entity.imageFocusY}
              />
              <div className={styles.entityCardCopy}>
                <div className={styles.entityCardHeading}>
                  <strong>{entity.name}</strong>
                  <span className={styles.badge}>{entity.visibilityScope}</span>
                </div>
                <span className={styles.meta}>{entity.type}</span>
                <p>
                  {entity.description ||
                    `${Object.keys(entity.data).length} structured custom field${Object.keys(entity.data).length === 1 ? '' : 's'}`}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  )
}
