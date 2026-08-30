'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { uiAssets } from '@/lib/ui-assets'
import { SelectBackgroundParticles } from '../_components/select-background-particles'
import { SelectLogoutButton } from '../_components/select-logout-button'
import styles from './manage-characters.module.css'

export interface ManageCharacterEntry {
  id: string
  name: string
  image: string
  ancestry: string | null
  description: string | null
  worldCharacters: Array<{
    id: string
    name: string
    worldId: string
    worldName: string
    campaignCount: number
  }>
}

function incarnationLabel(count: number) {
  if (count === 0) return 'Portable only'
  return `${count} World incarnation${count === 1 ? '' : 's'}`
}

function campaignLabel(count: number) {
  if (count === 0) return 'No Campaigns'
  return `${count} Campaign${count === 1 ? '' : 's'}`
}

export function ManageCharacterArchive({
  characters,
}: {
  characters: ManageCharacterEntry[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(characters[0]?.id ?? null)

  const filteredCharacters = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return characters

    return characters.filter((character) => {
      const searchable = [
        character.name,
        character.ancestry ?? '',
        character.description ?? '',
        ...character.worldCharacters.flatMap((incarnation) => [
          incarnation.name,
          incarnation.worldName,
        ]),
      ]
        .join(' ')
        .toLocaleLowerCase()
      return searchable.includes(normalized)
    })
  }, [characters, query])

  const selectedCharacter =
    filteredCharacters.find((character) => character.id === selectedId) ??
    filteredCharacters[0] ??
    null

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      router.push('/select')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  return (
    <section className={styles.stage} aria-label="Manage Characters">
      <div className={styles.background} aria-hidden="true">
        <Image
          src={uiAssets.select.backgroundDesktop.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.backgroundImage}
        />
      </div>
      <SelectBackgroundParticles />
      <Link className={styles.backLink} href="/select">
        <span aria-hidden="true">←</span> Back
      </Link>
      <SelectLogoutButton />

      <main className={styles.archiveShell}>
        <header className={styles.archiveHeader}>
          <div>
            <span className={styles.eyebrow}>Character archive</span>
            <h1>Manage Characters</h1>
            <p>Characters you create belong to you. Bring them into one World or many.</p>
          </div>
          <Link className={styles.createAction} href="/select/create-character">
            Create Character
          </Link>
        </header>

        <div className={styles.archiveGrid}>
          <aside className={styles.rosterPane} aria-label="Character roster">
            <div className={styles.rosterTools}>
              <label htmlFor="manage-character-search">Your Characters</label>
              <span>{characters.length}</span>
            </div>
            <input
              id="manage-character-search"
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search characters"
              autoComplete="off"
            />

            <div className={styles.rosterList}>
              {filteredCharacters.length > 0 ? (
                filteredCharacters.map((character) => {
                  const selected = character.id === selectedCharacter?.id
                  return (
                    <button
                      type="button"
                      className={styles.rosterRow}
                      data-selected={selected ? 'true' : 'false'}
                      aria-pressed={selected}
                      onClick={() => setSelectedId(character.id)}
                      key={character.id}
                    >
                      <span className={styles.rowPortrait} aria-hidden="true">
                        <Image
                          src={character.image}
                          alt=""
                          fill
                          sizes="64px"
                          className={styles.portraitImage}
                        />
                        <Image
                          src={uiAssets.ui.frames.goldCircle}
                          alt=""
                          fill
                          sizes="68px"
                          className={styles.portraitFrame}
                        />
                      </span>
                      <span className={styles.rowCopy}>
                        <strong>{character.name}</strong>
                        <span>{character.ancestry ?? 'Portable character'}</span>
                        <small>{incarnationLabel(character.worldCharacters.length)}</small>
                      </span>
                      <span className={styles.rowChevron} aria-hidden="true">›</span>
                    </button>
                  )
                })
              ) : (
                <div className={styles.emptyRoster}>
                  <strong>No matching Characters</strong>
                  <span>Try another name, ancestry, or World.</span>
                </div>
              )}
            </div>
          </aside>

          <section className={styles.detailPane} aria-live="polite">
            {selectedCharacter ? (
              <>
                <div className={styles.identityHeader}>
                  <div className={styles.detailPortrait} aria-hidden="true">
                    <Image
                      src={selectedCharacter.image}
                      alt=""
                      fill
                      sizes="180px"
                      className={styles.portraitImage}
                    />
                    <Image
                      src={uiAssets.ui.frames.goldCircle}
                      alt=""
                      fill
                      sizes="190px"
                      className={styles.portraitFrame}
                    />
                  </div>
                  <div className={styles.identityCopy}>
                    <span className={styles.eyebrow}>Portable Character</span>
                    <h2>{selectedCharacter.name}</h2>
                    <div className={styles.identityMeta}>
                      <span>{selectedCharacter.ancestry ?? 'Ancestry not added'}</span>
                      <span aria-hidden="true">•</span>
                      <span>{incarnationLabel(selectedCharacter.worldCharacters.length)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.descriptionBlock}>
                  <span className={styles.sectionLabel}>Who are they?</span>
                  <p>
                    {selectedCharacter.description ??
                      'No portable description has been added yet.'}
                  </p>
                </div>

                <div className={styles.worldSection}>
                  <div className={styles.sectionHeading}>
                    <span className={styles.sectionLabel}>World incarnations</span>
                    <span>{selectedCharacter.worldCharacters.length}</span>
                  </div>
                  {selectedCharacter.worldCharacters.length > 0 ? (
                    <div className={styles.worldList}>
                      {selectedCharacter.worldCharacters.map((incarnation) => (
                        <Link
                          className={styles.worldRow}
                          href={`/character/${incarnation.id}`}
                          key={incarnation.id}
                        >
                          <span>
                            <strong>{incarnation.worldName}</strong>
                            <small>
                              {incarnation.name === selectedCharacter.name
                                ? 'World incarnation'
                                : incarnation.name}
                            </small>
                          </span>
                          <span className={styles.worldMeta}>
                            {campaignLabel(incarnation.campaignCount)}
                            <b aria-hidden="true">›</b>
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyWorlds}>
                      <strong>Not yet part of a World</strong>
                      <p>This Character can stay portable until their story has somewhere to begin.</p>
                    </div>
                  )}
                </div>

                <div className={styles.detailActions}>
                  <Link
                    className={styles.primaryAction}
                    href={`/character/portable/${selectedCharacter.id}`}
                  >
                    Manage Character
                  </Link>
                  <Link className={styles.secondaryAction} href="/select/create-character">
                    Create another
                  </Link>
                </div>
              </>
            ) : characters.length === 0 ? (
              <div className={styles.emptyDetail}>
                <span className={styles.eyebrow}>Your first thread</span>
                <h2>No Characters yet</h2>
                <p>Create someone new, then bring them into a World when you are ready.</p>
                <Link className={styles.primaryAction} href="/select/create-character">
                  Create Character
                </Link>
              </div>
            ) : (
              <div className={styles.emptyDetail}>
                <span className={styles.eyebrow}>No match</span>
                <h2>No Character selected</h2>
                <p>Clear your search to return to your Character archive.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </section>
  )
}
