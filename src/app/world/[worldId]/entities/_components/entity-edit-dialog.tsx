'use client'

import { useRef } from 'react'
import type {
  WorldEntityTypeChoice,
  WorldEntityUiRecord,
} from '@/server/world-entities'
import pageStyles from '../entity.module.css'
import dialogStyles from './entity-edit-dialog.module.css'
import { EntityForm } from './entity-form'

export function EntityEditDialog({
  worldId,
  contextCampaignId,
  entityTypes,
  entities,
  relationshipTypes,
  campaigns,
  visibilityUsers,
  entity,
}: {
  worldId: string
  contextCampaignId?: string
  entityTypes: WorldEntityTypeChoice[]
  entities: WorldEntityUiRecord[]
  relationshipTypes: string[]
  campaigns: { id: string; name: string }[]
  visibilityUsers: { id: string; label: string }[]
  entity: WorldEntityUiRecord
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const selectableEntityTypes = entityTypes.filter(
    (type) =>
      type.value !== 'character' &&
      (type.scope === 'BUILT_IN' ||
        (type.usageCount ?? 0) > 0 ||
        type.value === entity.type),
  )

  return (
    <>
      <button
        className={pageStyles.secondaryButton}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        Edit entity
      </button>

      <dialog
        className={dialogStyles.dialog}
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
      >
        <div className={dialogStyles.shell}>
          <header className={dialogStyles.header}>
            <div>
              <h2>Edit {entity.name}</h2>
              <p>Changes are saved without leaving the entity page.</p>
            </div>
            <button
              className={dialogStyles.closeButton}
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              Close
            </button>
          </header>

          <div className={dialogStyles.body}>
            <EntityForm
              mode="edit"
              worldId={worldId}
              contextCampaignId={contextCampaignId}
              entityTypes={selectableEntityTypes}
              entities={entities}
              relationshipTypes={relationshipTypes}
              campaigns={campaigns}
              visibilityUsers={visibilityUsers}
              initialEntity={entity}
            />
          </div>
        </div>
      </dialog>
    </>
  )
}
