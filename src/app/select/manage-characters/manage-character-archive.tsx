'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { uiAssets } from '@/lib/ui-assets'
import { SelectBackgroundParticles } from '../_components/select-background-particles'
import { SelectLogoutButton } from '../_components/select-logout-button'
import styles from './manage-characters.module.css'

type ProfileFieldKey =
  | 'whoIs'
  | 'home'
  | 'personality'
  | 'goals'
  | 'ideals'
  | 'bonds'
  | 'flaws'
  | 'affiliations'

type ManagerTab = 'overview' | 'identity' | 'worlds' | 'manage'

type CampaignRole = 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'

const PROFILE_FIELDS: ReadonlyArray<{
  key: ProfileFieldKey
  label: string
}> = [
  { key: 'whoIs', label: 'Who are they?' },
  { key: 'home', label: 'Where are they from?' },
  { key: 'personality', label: 'Personality' },
  { key: 'goals', label: 'Goals' },
  { key: 'ideals', label: 'Ideals' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'flaws', label: 'Flaws & fears' },
  { key: 'affiliations', label: 'Affiliations' },
]

export interface ManageWorldCharacterEntry {
  id: string
  name: string
  nameOverride: string | null
  worldId: string
  worldName: string
  campaignCount: number
  profile: {
    values: Partial<Record<ProfileFieldKey, string>>
    hiddenFields: string[]
  }
  participations: Array<{
    id: string
    status: string
    campaign: {
      id: string
      name: string
      status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
      role: CampaignRole
    }
  }>
  availableCampaigns: Array<{
    id: string
    name: string
    role: Exclude<CampaignRole, 'SPECTATOR'>
  }>
}

export interface ManageCharacterEntry {
  id: string
  name: string
  image: string
  ancestry: string | null
  description: string | null
  availableWorlds: Array<{ id: string; name: string }>
  unavailableWorlds: Array<{ id: string; name: string }>
  worldCharacters: ManageWorldCharacterEntry[]
}

function incarnationLabel(count: number) {
  if (count === 0) return 'Portable only'
  return `${count} World incarnation${count === 1 ? '' : 's'}`
}

function campaignLabel(count: number) {
  if (count === 0) return 'No Campaigns'
  return `${count} Campaign${count === 1 ? '' : 's'}`
}

async function responseError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: { message?: string } }
    return payload.error?.message ?? fallback
  } catch {
    return fallback
  }
}

function StatusMessage({
  error,
  success,
}: {
  error: string | null
  success: string | null
}) {
  if (error) return <p className={styles.formError}>{error}</p>
  if (success) return <p className={styles.formSuccess}>{success}</p>
  return null
}

function OverviewTab({
  character,
  onOpenWorlds,
}: {
  character: ManageCharacterEntry
  onOpenWorlds: () => void
}) {
  return (
    <div className={styles.tabSection}>
      <div className={styles.descriptionBlock}>
        <span className={styles.sectionLabel}>Who are they?</span>
        <p>
          {character.description ??
            'No portable description has been added yet. Use Identity to describe this Character.'}
        </p>
      </div>

      <div className={styles.worldSection}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionLabel}>World incarnations</span>
          <span>{character.worldCharacters.length}</span>
        </div>
        {character.worldCharacters.length > 0 ? (
          <div className={styles.worldList}>
            {character.worldCharacters.map((incarnation) => (
              <button
                type="button"
                className={styles.worldRow}
                onClick={onOpenWorlds}
                key={incarnation.id}
              >
                <span>
                  <strong>{incarnation.worldName}</strong>
                  <small>
                    {incarnation.name === character.name
                      ? 'World incarnation'
                      : incarnation.name}
                  </small>
                </span>
                <span className={styles.worldMeta}>
                  {campaignLabel(incarnation.campaignCount)}
                  <b aria-hidden="true">›</b>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.emptyWorlds}>
            <strong>Not yet part of a World</strong>
            <p>
              This Character can stay portable until their story has somewhere
              to begin.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function IdentityTab({ character }: { character: ManageCharacterEntry }) {
  const router = useRouter()
  const [name, setName] = useState(character.name)
  const [ancestry, setAncestry] = useState(character.ancestry ?? '')
  const [description, setDescription] = useState(character.description ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function saveIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    setSuccess(null)

    const response = await fetch(`/api/v1/characters/${character.id}/identity`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, ancestry, description }),
    })

    if (!response.ok) {
      setError(await responseError(response, 'Could not save Character identity.'))
      setPending(false)
      return
    }

    setSuccess('Portable Character identity saved.')
    setPending(false)
    router.refresh()
  }

  return (
    <form className={styles.editorForm} onSubmit={saveIdentity}>
      <div className={styles.editorIntro}>
        <span className={styles.sectionLabel}>Portable identity</span>
        <p>
          These details belong to the Character everywhere. World-specific
          history and personality can be shaped separately in Worlds & Campaigns.
        </p>
      </div>

      <label className={styles.field}>
        <span>Name</span>
        <input
          value={name}
          maxLength={120}
          required
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span>Ancestry / Species <small>optional</small></span>
        <input
          value={ancestry}
          maxLength={120}
          placeholder="Human, Goblin, Elf, Android…"
          onChange={(event) => setAncestry(event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span>Description <small>optional</small></span>
        <textarea
          value={description}
          maxLength={1200}
          rows={5}
          placeholder="Who are they?"
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <div className={styles.imageFuture}>
        <div className={styles.smallPortrait} aria-hidden="true">
          <Image
            src={character.image}
            alt=""
            fill
            sizes="82px"
            className={styles.portraitImage}
          />
          <Image
            src={uiAssets.ui.frames.goldCircle}
            alt=""
            fill
            sizes="86px"
            className={styles.portraitFrame}
          />
        </div>
        <div>
          <span className={styles.sectionLabel}>Character image</span>
          <strong>Image replacement is coming here</strong>
          <p>
            Uploading or replacing Character artwork will be managed from this
            Identity tab in a later image-upload pass.
          </p>
        </div>
        <span className={styles.futureBadge}>Future</span>
      </div>

      <div className={styles.formFooter}>
        <StatusMessage error={error} success={success} />
        <button className={styles.primaryAction} type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save identity'}
        </button>
      </div>
    </form>
  )
}

function WorldProfileEditor({
  worldCharacter,
}: {
  worldCharacter: ManageWorldCharacterEntry
}) {
  const router = useRouter()
  const [nameOverride, setNameOverride] = useState(worldCharacter.nameOverride ?? '')
  const [values, setValues] = useState<Partial<Record<ProfileFieldKey, string>>>(
    worldCharacter.profile.values,
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [campaignId, setCampaignId] = useState(
    worldCharacter.availableCampaigns[0]?.id ?? '',
  )
  const [campaignPending, setCampaignPending] = useState<string | null>(null)

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    setSuccess(null)

    const response = await fetch(
      `/api/v1/world-characters/${worldCharacter.id}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nameOverride,
          profile: {
            values,
            hiddenFields: worldCharacter.profile.hiddenFields,
          },
        }),
      },
    )

    if (!response.ok) {
      setError(await responseError(response, 'Could not save World profile.'))
      setPending(false)
      return
    }

    setSuccess(`${worldCharacter.worldName} profile saved.`)
    setPending(false)
    router.refresh()
  }

  async function joinCampaign() {
    if (!campaignId) return
    setCampaignPending('join')
    setError(null)
    setSuccess(null)
    const response = await fetch(
      `/api/v1/world-characters/${worldCharacter.id}/campaign-characters`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      },
    )
    if (!response.ok) {
      setError(await responseError(response, 'Could not join Campaign.'))
      setCampaignPending(null)
      return
    }
    setSuccess('Campaign participation added.')
    setCampaignPending(null)
    router.refresh()
  }

  async function leaveCampaign(participationId: string, campaignName: string) {
    if (!window.confirm(`Remove this Character from ${campaignName}?`)) return
    setCampaignPending(participationId)
    setError(null)
    setSuccess(null)
    const response = await fetch(`/api/v1/campaign-characters/${participationId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      setError(await responseError(response, 'Could not leave Campaign.'))
      setCampaignPending(null)
      return
    }
    setSuccess(`Removed from ${campaignName}.`)
    setCampaignPending(null)
    router.refresh()
  }

  return (
    <section className={styles.worldEditor}>
      <header className={styles.worldEditorHeader}>
        <div>
          <span className={styles.sectionLabel}>World incarnation</span>
          <h3>{worldCharacter.worldName}</h3>
        </div>
        <span>{campaignLabel(worldCharacter.participations.length)}</span>
      </header>

      <form className={styles.worldProfileForm} onSubmit={saveProfile}>
        <label className={styles.field}>
          <span>World-specific name <small>optional</small></span>
          <input
            value={nameOverride}
            maxLength={120}
            placeholder={worldCharacter.name}
            onChange={(event) => setNameOverride(event.target.value)}
          />
        </label>

        <div className={styles.profileGrid}>
          {PROFILE_FIELDS.map((field) => (
            <label className={styles.field} key={field.key}>
              <span>{field.label}</span>
              <textarea
                value={values[field.key] ?? ''}
                rows={field.key === 'whoIs' ? 3 : 2}
                maxLength={2000}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>

        <div className={styles.inlineActionRow}>
          <button className={styles.primaryAction} type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save World profile'}
          </button>
        </div>
      </form>

      <div className={styles.campaignManager}>
        <span className={styles.sectionLabel}>Campaign participation</span>
        {worldCharacter.participations.length > 0 ? (
          <div className={styles.campaignList}>
            {worldCharacter.participations.map((participation) => (
              <div className={styles.campaignRow} key={participation.id}>
                <span>
                  <strong>{participation.campaign.name}</strong>
                  <small>
                    {participation.campaign.status} · {participation.campaign.role}
                  </small>
                </span>
                <button
                  className={styles.dangerTextAction}
                  type="button"
                  disabled={campaignPending === participation.id}
                  onClick={() =>
                    void leaveCampaign(
                      participation.id,
                      participation.campaign.name,
                    )
                  }
                >
                  {campaignPending === participation.id ? 'Removing…' : 'Leave'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.mutedCopy}>Not participating in a Campaign here.</p>
        )}

        {worldCharacter.availableCampaigns.length > 0 ? (
          <div className={styles.joinCampaignRow}>
            <select
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
            >
              {worldCharacter.availableCampaigns.map((campaign) => (
                <option value={campaign.id} key={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
            <button
              className={styles.secondaryAction}
              type="button"
              disabled={!campaignId || campaignPending === 'join'}
              onClick={() => void joinCampaign()}
            >
              {campaignPending === 'join' ? 'Joining…' : 'Join Campaign'}
            </button>
          </div>
        ) : null}
      </div>

      <StatusMessage error={error} success={success} />
    </section>
  )
}

function WorldsTab({ character }: { character: ManageCharacterEntry }) {
  if (character.worldCharacters.length === 0) {
    return (
      <div className={styles.tabSection}>
        <div className={styles.emptyWorlds}>
          <strong>No World incarnations yet</strong>
          <p>
            Use Manage to add this portable Character to a World when you are
            ready.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.worldEditors}>
      {character.worldCharacters.map((worldCharacter) => (
        <WorldProfileEditor
          key={worldCharacter.id}
          worldCharacter={worldCharacter}
        />
      ))}
    </div>
  )
}

function ManageAction({
  title,
  description,
  children,
  danger = false,
}: {
  title: string
  description: ReactNode
  children: ReactNode
  danger?: boolean
}) {
  return (
    <section className={styles.manageAction} data-danger={danger ? 'true' : 'false'}>
      <div>
        <h3>{title}</h3>
        <div className={styles.manageDescription}>{description}</div>
      </div>
      <div className={styles.manageControls}>{children}</div>
    </section>
  )
}

function ManageTab({ character }: { character: ManageCharacterEntry }) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [addWorldId, setAddWorldId] = useState(character.availableWorlds[0]?.id ?? '')
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({})

  function resetMessages() {
    setError(null)
    setSuccess(null)
  }

  async function addToWorld() {
    if (!addWorldId) return
    resetMessages()
    setPending('add-world')
    const world = character.availableWorlds.find((item) => item.id === addWorldId)
    const response = await fetch(
      `/api/v1/characters/${character.id}/world-characters`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ worldId: addWorldId }),
      },
    )
    if (!response.ok) {
      setError(await responseError(response, 'Could not add Character to World.'))
      setPending(null)
      return
    }
    setSuccess(`Added ${character.name} to ${world?.name ?? 'the World'}.`)
    setPending(null)
    router.refresh()
  }

  async function removeWorld(worldCharacter: ManageWorldCharacterEntry) {
    if (
      !window.confirm(
        `Remove ${character.name} from ${worldCharacter.worldName}? The portable Character will remain.`,
      )
    ) {
      return
    }
    resetMessages()
    setPending(`remove-world:${worldCharacter.id}`)
    const response = await fetch(
      `/api/v1/world-characters/${worldCharacter.id}`,
      { method: 'DELETE' },
    )
    if (!response.ok) {
      setError(
        await responseError(response, 'Could not remove Character from World.'),
      )
      setPending(null)
      return
    }
    setSuccess(`Removed ${character.name} from ${worldCharacter.worldName}.`)
    setPending(null)
    router.refresh()
  }

  async function moveWorld(worldCharacter: ManageWorldCharacterEntry) {
    const targetWorldId = moveTargets[worldCharacter.id]
    if (!targetWorldId) return
    const target = character.availableWorlds.find(
      (world) => world.id === targetWorldId,
    )
    if (
      !window.confirm(
        `Move this incarnation from ${worldCharacter.worldName} to ${target?.name ?? 'the selected World'}?`,
      )
    ) {
      return
    }
    resetMessages()
    setPending(`move-world:${worldCharacter.id}`)
    const response = await fetch(
      `/api/v1/world-characters/${worldCharacter.id}/migrate`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetWorldId }),
      },
    )
    if (!response.ok) {
      setError(await responseError(response, 'Could not move Character.'))
      setPending(null)
      return
    }
    setSuccess(`Moved the incarnation to ${target?.name ?? 'the selected World'}.`)
    setPending(null)
    router.refresh()
  }

  async function deleteCharacter() {
    if (
      !window.confirm(
        `Delete ${character.name} permanently? This cannot be undone.`,
      )
    ) {
      return
    }
    resetMessages()
    setPending('delete-character')
    const response = await fetch(
      `/api/v1/characters/${character.id}/lifecycle`,
      { method: 'DELETE' },
    )
    if (!response.ok) {
      setError(await responseError(response, 'Could not delete Character.'))
      setPending(null)
      return
    }
    setPending(null)
    router.refresh()
  }

  const activeWorldNames = character.worldCharacters.map(
    (worldCharacter) => worldCharacter.worldName,
  )
  const unavailableWorldNames = character.unavailableWorlds.map(
    (world) => world.name,
  )
  const blockingWorldNames = [...activeWorldNames, ...unavailableWorldNames]

  return (
    <div className={styles.manageStack}>
      <div className={styles.editorIntro}>
        <span className={styles.sectionLabel}>Character management</span>
        <p>
          Change where this Character can be played. Destructive actions never
          remove the portable Character unless you explicitly delete it.
        </p>
      </div>

      {character.availableWorlds.length > 0 ? (
        <ManageAction
          title="Add to another World"
          description="Create a new World incarnation while keeping every existing incarnation intact."
        >
          <select value={addWorldId} onChange={(event) => setAddWorldId(event.target.value)}>
            {character.availableWorlds.map((world) => (
              <option value={world.id} key={world.id}>
                {world.name}
              </option>
            ))}
          </select>
          <button
            className={styles.secondaryAction}
            type="button"
            disabled={!addWorldId || pending === 'add-world'}
            onClick={() => void addToWorld()}
          >
            {pending === 'add-world' ? 'Adding…' : 'Add to World'}
          </button>
        </ManageAction>
      ) : null}

      {character.worldCharacters.map((worldCharacter) => {
        const campaignNames = worldCharacter.participations.map(
          (participation) => participation.campaign.name,
        )
        const blocked = campaignNames.length > 0
        const targetWorldId = moveTargets[worldCharacter.id] ?? ''

        return (
          <ManageAction
            key={worldCharacter.id}
            title={worldCharacter.worldName}
            description={
              blocked ? (
                <>
                  <p>
                    This incarnation is still active in{' '}
                    <strong>{campaignNames.join(', ')}</strong>.
                  </p>
                  <p className={styles.tipCopy}>
                    Tip: open <b>Worlds & Campaigns</b> and leave those Campaigns
                    first. After that you can move or remove this World
                    incarnation here.
                  </p>
                </>
              ) : (
                <p>
                  Move this incarnation to another World, or remove it while
                  keeping the portable Character.
                </p>
              )
            }
          >
            {character.availableWorlds.length > 0 ? (
              <div className={styles.moveControls}>
                <select
                  value={targetWorldId}
                  disabled={blocked}
                  onChange={(event) =>
                    setMoveTargets((current) => ({
                      ...current,
                      [worldCharacter.id]: event.target.value,
                    }))
                  }
                >
                  <option value="">Move to…</option>
                  {character.availableWorlds.map((world) => (
                    <option value={world.id} key={world.id}>
                      {world.name}
                    </option>
                  ))}
                </select>
                <button
                  className={styles.secondaryAction}
                  type="button"
                  disabled={
                    blocked ||
                    !targetWorldId ||
                    pending === `move-world:${worldCharacter.id}`
                  }
                  onClick={() => void moveWorld(worldCharacter)}
                >
                  {pending === `move-world:${worldCharacter.id}`
                    ? 'Moving…'
                    : 'Move'}
                </button>
              </div>
            ) : null}
            <button
              className={styles.dangerAction}
              type="button"
              disabled={
                blocked || pending === `remove-world:${worldCharacter.id}`
              }
              onClick={() => void removeWorld(worldCharacter)}
            >
              {pending === `remove-world:${worldCharacter.id}`
                ? 'Removing…'
                : 'Remove from World'}
            </button>
          </ManageAction>
        )
      })}

      {character.unavailableWorlds.length > 0 ? (
        <div className={styles.accessWarning}>
          <strong>Some incarnations cannot currently be managed here</strong>
          <p>
            {character.name} still has an incarnation in{' '}
            {unavailableWorldNames.join(', ')}, but you no longer have playable
            access there. A World or Campaign manager may need to restore access
            or resolve that incarnation before the portable Character can be
            deleted.
          </p>
        </div>
      ) : null}

      <ManageAction
        title="Character image"
        description="Uploading and replacing Character artwork will live here once the image upload pipeline is available."
      >
        <span className={styles.futureBadge}>Future</span>
      </ManageAction>

      <ManageAction
        title="Delete portable Character"
        danger
        description={
          blockingWorldNames.length > 0 ? (
            <>
              <p>
                {character.name} still exists in{' '}
                <strong>{blockingWorldNames.join(', ')}</strong>.
              </p>
              <p className={styles.tipCopy}>
                Tip: remove the Character from every Campaign first, then remove
                each World incarnation. Permanent deletion becomes available
                only when the Character is fully portable again.
              </p>
            </>
          ) : (
            <p>
              This Character is no longer active in any World or Campaign. You
              can permanently delete the portable Character.
            </p>
          )
        }
      >
        <button
          className={styles.dangerAction}
          type="button"
          disabled={blockingWorldNames.length > 0 || pending === 'delete-character'}
          onClick={() => void deleteCharacter()}
        >
          {pending === 'delete-character' ? 'Deleting…' : 'Delete Character'}
        </button>
      </ManageAction>

      <StatusMessage error={error} success={success} />
    </div>
  )
}

export function ManageCharacterArchive({
  characters,
}: {
  characters: ManageCharacterEntry[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(characters[0]?.id ?? null)
  const [activeTab, setActiveTab] = useState<ManagerTab>('overview')

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
          ...incarnation.participations.map(
            (participation) => participation.campaign.name,
          ),
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
            <p>
              Characters you create belong to you. Bring them into one World or
              many.
            </p>
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
                        <small>
                          {incarnationLabel(character.worldCharacters.length)}
                        </small>
                      </span>
                      <span className={styles.rowChevron} aria-hidden="true">
                        ›
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className={styles.emptyRoster}>
                  <strong>No matching Characters</strong>
                  <span>Try another name, ancestry, World, or Campaign.</span>
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
                      sizes="150px"
                      className={styles.portraitImage}
                    />
                    <Image
                      src={uiAssets.ui.frames.goldCircle}
                      alt=""
                      fill
                      sizes="160px"
                      className={styles.portraitFrame}
                    />
                  </div>
                  <div className={styles.identityCopy}>
                    <span className={styles.eyebrow}>Portable Character</span>
                    <h2>{selectedCharacter.name}</h2>
                    <div className={styles.identityMeta}>
                      <span>
                        {selectedCharacter.ancestry ?? 'Ancestry not added'}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>
                        {incarnationLabel(
                          selectedCharacter.worldCharacters.length,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <nav className={styles.tabs} aria-label="Character management sections">
                  {(
                    [
                      ['overview', 'Overview'],
                      ['identity', 'Identity'],
                      ['worlds', 'Worlds & Campaigns'],
                      ['manage', 'Manage'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      type="button"
                      className={styles.tabButton}
                      data-active={activeTab === key ? 'true' : 'false'}
                      aria-pressed={activeTab === key}
                      onClick={() => setActiveTab(key)}
                      key={key}
                    >
                      {label}
                    </button>
                  ))}
                </nav>

                <div className={styles.tabContent} key={`${selectedCharacter.id}:${activeTab}`}>
                  {activeTab === 'overview' ? (
                    <OverviewTab
                      character={selectedCharacter}
                      onOpenWorlds={() => setActiveTab('worlds')}
                    />
                  ) : activeTab === 'identity' ? (
                    <IdentityTab character={selectedCharacter} />
                  ) : activeTab === 'worlds' ? (
                    <WorldsTab character={selectedCharacter} />
                  ) : (
                    <ManageTab character={selectedCharacter} />
                  )}
                </div>
              </>
            ) : characters.length === 0 ? (
              <div className={styles.emptyDetail}>
                <span className={styles.eyebrow}>Your first thread</span>
                <h2>No Characters yet</h2>
                <p>
                  Create someone new, then bring them into a World when you are
                  ready.
                </p>
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
