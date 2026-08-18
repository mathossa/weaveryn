'use client'

import { useRef } from 'react'
import type { WorldEntityUiRecord } from '@/server/world-entities'
import pageStyles from '../entity.module.css'
import dialogStyles from './connection-dialog.module.css'
import { RelationshipForm } from './relationship-form'

export function ConnectionDialog({
  worldId,
  sourceEntityId,
  sourceEntityName,
  entities,
  relationshipTypes,
  campaigns,
  visibilityUsers,
  contextCampaignId,
}: {
  worldId: string
  sourceEntityId: string
  sourceEntityName: string
  entities: WorldEntityUiRecord[]
  relationshipTypes: string[]
  campaigns: { id: string; name: string }[]
  visibilityUsers: { id: string; label: string }[]
  contextCampaignId?: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        className={pageStyles.primaryButton}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        Add connection
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
              <h2>Add connection</h2>
              <p>Connect {sourceEntityName} to another entity.</p>
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
            <RelationshipForm
              worldId={worldId}
              sourceEntityId={sourceEntityId}
              sourceEntityName={sourceEntityName}
              entities={entities}
              relationshipTypes={relationshipTypes}
              campaigns={campaigns}
              visibilityUsers={visibilityUsers}
              contextCampaignId={contextCampaignId}
            />
          </div>
        </div>
      </dialog>
    </>
  )
}
