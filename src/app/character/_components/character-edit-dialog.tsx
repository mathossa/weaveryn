'use client'

import { useState } from 'react'
import type { WorldCharacterProfile } from '@/lib/world-character-profile'
import { CharacterForm } from './character-form'
import { CharacterProfileEditor } from './character-profile-editor'
import { WorldCharacterForm } from './world-character-form'
import styles from '../character.module.css'

export function CharacterEditDialog({
  characterId,
  characterName,
  worldCharacterId,
  worldName,
  nameOverride,
  profile,
  canEditWorldIdentity,
}: {
  characterId: string
  characterName: string
  worldCharacterId: string
  worldName: string
  nameOverride: string | null
  profile: WorldCharacterProfile
  canEditWorldIdentity: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className={styles.secondary}
        type="button"
        onClick={() => setOpen(true)}
      >
        Edit character
      </button>
      {open ? (
        <div
          className={styles.profileModalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false)
          }}
        >
          <section
            className={styles.profileModal}
            role="dialog"
            aria-modal="true"
            aria-label="Edit Character"
          >
            <div className={styles.profileModalHeader}>
              <div>
                <span className={styles.profileKicker}>Character</span>
                <h2>Edit {characterName}</h2>
              </div>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className={styles.profileModalSection}>
              <h3>Portable identity</h3>
              <p className={styles.meta}>
                The base name belongs to the portable Character across Worlds.
              </p>
              <CharacterForm
                mode="edit"
                characterId={characterId}
                initialName={characterName}
              />
            </div>

            <div className={styles.profileModalSection}>
              <h3>{worldName} identity</h3>
              {canEditWorldIdentity ? (
                <WorldCharacterForm
                  worldCharacterId={worldCharacterId}
                  initialNameOverride={nameOverride}
                />
              ) : (
                <p className={styles.meta}>
                  This World-specific identity is currently read-only.
                </p>
              )}
            </div>

            <div className={styles.profileModalSection}>
              <h3>Profile fields</h3>
              <CharacterProfileEditor
                worldCharacterId={worldCharacterId}
                profile={profile}
              />
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
