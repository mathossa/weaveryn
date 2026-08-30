'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { uiAssets } from '@/lib/ui-assets'
import { SelectBackgroundParticles } from '../../_components/select-background-particles'
import { SelectLogoutButton } from '../../_components/select-logout-button'
import styles from '../character-creation.module.css'

const DESKTOP_COMPOSITION_WIDTH = 2560
const DESKTOP_COMPOSITION_HEIGHT = 1276

type Phase = 'identity' | 'world' | 'campaign'

type PendingAction =
  | 'create'
  | `world:${string}`
  | `campaign:${string}`
  | null

interface CharacterSummary {
  id: string
  name: string
  image: string | null
}

interface WorldChoice {
  id: string
  name: string
  accessKind: string
}

interface CampaignChoice {
  id: string
  name: string
  role: 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'
  status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
}

interface CampaignSelectionResponse {
  world: { id: string; name: string }
  campaigns: CampaignChoice[]
}

function errorMessage(result: unknown, fallback: string) {
  if (
    result &&
    typeof result === 'object' &&
    'error' in result &&
    result.error &&
    typeof result.error === 'object' &&
    'message' in result.error &&
    typeof result.error.message === 'string'
  ) {
    return result.error.message
  }
  return fallback
}

function canAttachCharacterToCampaign(campaign: CampaignChoice) {
  return campaign.status === 'ACTIVE' && campaign.role !== 'SPECTATOR'
}

function prioritizeById<T extends { id: string }>(items: T[], preferredId?: string) {
  if (!preferredId) return items
  return [...items].sort((left, right) => {
    if (left.id === preferredId) return -1
    if (right.id === preferredId) return 1
    return 0
  })
}

async function jsonResult(response: Response): Promise<unknown> {
  return response.json().catch(() => null)
}

export function CharacterCreationLauncher({
  targetWorldId,
  targetCampaignId,
}: {
  targetWorldId?: string
  targetCampaignId?: string
}) {
  const router = useRouter()
  const stageRef = useRef<HTMLElement>(null)
  const compositionRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('identity')
  const [name, setName] = useState('')
  const [ancestry, setAncestry] = useState('')
  const [description, setDescription] = useState('')
  const [createdCharacter, setCreatedCharacter] =
    useState<CharacterSummary | null>(null)
  const [worlds, setWorlds] = useState<WorldChoice[]>([])
  const [selectedWorld, setSelectedWorld] = useState<WorldChoice | null>(null)
  const [worldCharacterId, setWorldCharacterId] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignChoice[]>([])
  const [showAllWorlds, setShowAllWorlds] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [error, setError] = useState<string | null>(null)

  const visibleWorlds = useMemo(
    () => (showAllWorlds ? worlds : worlds.slice(0, 3)),
    [showAllWorlds, worlds],
  )

  const heroSrc = createdCharacter?.image ?? '/images/select/hero/default.webp'

  useLayoutEffect(() => {
    const stage = stageRef.current
    const composition = compositionRef.current
    if (!stage || !composition) return

    const updateCompositionScale = () => {
      if (window.matchMedia('(max-width: 760px)').matches) {
        composition.style.removeProperty('--launcher-scale')
        return
      }

      const { width, height } = stage.getBoundingClientRect()
      if (width <= 0 || height <= 0) return

      const scale = Math.min(
        width / DESKTOP_COMPOSITION_WIDTH,
        height / DESKTOP_COMPOSITION_HEIGHT,
      )
      composition.style.setProperty('--launcher-scale', String(scale))
    }

    updateCompositionScale()
    window.addEventListener('resize', updateCompositionScale)

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateCompositionScale)
    resizeObserver?.observe(stage)

    return () => {
      window.removeEventListener('resize', updateCompositionScale)
      resizeObserver?.disconnect()
    }
  }, [])

  async function attachCampaign(
    nextWorldCharacterId: string,
    worldId: string,
    campaign: CampaignChoice,
  ) {
    setPendingAction(`campaign:${campaign.id}`)
    setError(null)

    const response = await fetch(
      `/api/v1/world-characters/${nextWorldCharacterId}/campaign-characters`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id }),
      },
    )
    const result = await jsonResult(response)

    if (!response.ok) {
      setError(
        errorMessage(result, 'Could not add this Character to the Campaign.'),
      )
      setPendingAction(null)
      return
    }

    router.push(
      `/world/${worldId}/campaign/${campaign.id}?character=${nextWorldCharacterId}`,
    )
  }

  async function attachWorld(characterId: string, world: WorldChoice) {
    setPendingAction(`world:${world.id}`)
    setError(null)

    const response = await fetch(
      `/api/v1/characters/${characterId}/world-characters`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ worldId: world.id, nameOverride: null }),
      },
    )
    const result = (await jsonResult(response)) as
      | { worldCharacter?: { id?: string } }
      | null

    if (!response.ok || !result?.worldCharacter?.id) {
      setError(
        errorMessage(result, 'Could not bring this Character into the World.'),
      )
      setPendingAction(null)
      return
    }

    const nextWorldCharacterId = result.worldCharacter.id
    setSelectedWorld(world)
    setWorldCharacterId(nextWorldCharacterId)

    const campaignResponse = await fetch(`/api/v1/worlds/${world.id}/campaigns`)
    const campaignResult = (await jsonResult(
      campaignResponse,
    )) as CampaignSelectionResponse | null

    if (!campaignResponse.ok || !campaignResult) {
      setError(
        errorMessage(
          campaignResult,
          'The Character entered the World, but Campaign choices could not be loaded.',
        ),
      )
      setCampaigns([])
      setPhase('campaign')
      setPendingAction(null)
      return
    }

    const eligibleCampaigns = prioritizeById(
      campaignResult.campaigns.filter(canAttachCharacterToCampaign),
      targetCampaignId,
    )
    setCampaigns(eligibleCampaigns)
    setPhase('campaign')
    setPendingAction(null)
  }

  async function submitIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingAction) return

    setPendingAction('create')
    setError(null)

    const response = await fetch('/api/v1/characters', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, ancestry, description }),
    })
    const result = (await jsonResult(response)) as
      | { character?: CharacterSummary }
      | null

    if (!response.ok || !result?.character) {
      setError(errorMessage(result, 'Character creation failed.'))
      setPendingAction(null)
      return
    }

    const character = result.character
    setCreatedCharacter(character)

    const worldResponse = await fetch('/api/v1/worlds')
    const worldResult = (await jsonResult(worldResponse)) as
      | { worlds?: WorldChoice[] }
      | null

    if (!worldResponse.ok) {
      setError(
        errorMessage(
          worldResult,
          'The Character was created, but available Worlds could not be loaded.',
        ),
      )
      setWorlds([])
      setPhase('world')
      setPendingAction(null)
      return
    }

    setWorlds(prioritizeById(worldResult?.worlds ?? [], targetWorldId))
    setPhase('world')
    setPendingAction(null)
  }

  return (
    <section
      ref={stageRef}
      className={styles.stage}
      aria-label="Create a Character"
    >
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
      <SelectLogoutButton />

      <Link className={styles.backLink} href="/select">
        <span aria-hidden="true">←</span> Back
      </Link>

      <div ref={compositionRef} className={styles.desktopComposition}>
        <div className={styles.heroArtwork} aria-hidden="true">
          <Image
            src={heroSrc}
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 76vw, 580px"
            className={styles.heroImage}
          />
        </div>

        <div className={styles.panelShell}>
          <div className={styles.panel}>
            {phase === 'identity' ? (
              <form className={styles.identityForm} onSubmit={submitIdentity}>
                <div className={styles.panelHeader}>
                  <span className={styles.eyebrow}>A new thread</span>
                  <h1>Create Character</h1>
                  <p>Every story begins with someone.</p>
                </div>

                <div className={styles.field}>
                  <label htmlFor="character-name">Name</label>
                  <input
                    id="character-name"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    maxLength={120}
                    autoFocus
                    placeholder="Who are they called?"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="character-ancestry">
                    Ancestry / Species <span>Optional</span>
                  </label>
                  <input
                    id="character-ancestry"
                    name="ancestry"
                    value={ancestry}
                    onChange={(event) => setAncestry(event.target.value)}
                    maxLength={120}
                    placeholder="Human, Goblin, Elf, Android…"
                  />
                  <small>
                    Use whatever term fits this character and their stories.
                  </small>
                </div>

                <div className={styles.field}>
                  <label htmlFor="character-description">
                    Description <span>Optional</span>
                  </label>
                  <textarea
                    id="character-description"
                    name="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={1200}
                    rows={4}
                    placeholder="Who are they? A traveller, a scholar, a thief, a hero?"
                  />
                </div>

                <div className={styles.imageField}>
                  <div className={styles.imagePreview} aria-hidden="true">
                    <Image
                      src={uiAssets.fallbacks.character}
                      alt=""
                      fill
                      sizes="88px"
                      className={styles.imagePreviewImage}
                    />
                    <Image
                      src={uiAssets.ui.frames.goldCircle}
                      alt=""
                      fill
                      sizes="96px"
                      className={styles.imagePreviewFrame}
                    />
                  </div>
                  <div>
                    <span className={styles.imageLabel}>Character image</span>
                    <strong>Use placeholder for now</strong>
                    <small>
                      Artwork can be replaced later; the character always has a
                      visual identity.
                    </small>
                  </div>
                </div>

                {error ? <p className={styles.error}>{error}</p> : null}

                <button
                  className={styles.primaryAction}
                  disabled={Boolean(pendingAction)}
                  type="submit"
                >
                  {pendingAction === 'create'
                    ? 'Creating…'
                    : 'Create Character'}
                </button>
              </form>
            ) : phase === 'world' ? (
              <div className={styles.choicePhase}>
                <div className={styles.panelHeader}>
                  <span className={styles.eyebrow}>The first crossing</span>
                  <h1>
                    Where will {createdCharacter?.name}&apos;s story begin?
                  </h1>
                  <p>
                    Bring this character into a World, or keep them for another
                    day.
                  </p>
                </div>

                <div
                  className={`${styles.choiceList} ${showAllWorlds ? styles.choiceListScrollable : ''}`}
                >
                  {visibleWorlds.length > 0 ? (
                    visibleWorlds.map((world) => (
                      <button
                        key={world.id}
                        className={styles.choiceCard}
                        type="button"
                        disabled={Boolean(pendingAction)}
                        onClick={() =>
                          createdCharacter
                            ? void attachWorld(createdCharacter.id, world)
                            : undefined
                        }
                      >
                        <span>
                          <strong>{world.name}</strong>
                          <small>
                            {world.id === targetWorldId
                              ? 'Suggested destination'
                              : 'A world this character can enter'}
                          </small>
                        </span>
                        <span className={styles.choiceAction}>
                          {pendingAction === `world:${world.id}`
                            ? 'Entering…'
                            : 'Enter World'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <strong>No Worlds are available yet.</strong>
                      <p>Your Character is safe and can enter a World later.</p>
                    </div>
                  )}
                </div>

                {worlds.length > 3 ? (
                  <button
                    className={styles.browseButton}
                    type="button"
                    onClick={() => setShowAllWorlds((value) => !value)}
                  >
                    {showAllWorlds
                      ? 'Show featured Worlds'
                      : 'Browse all Worlds'}
                  </button>
                ) : null}

                {error ? <p className={styles.error}>{error}</p> : null}

                <button
                  className={styles.secondaryAction}
                  type="button"
                  onClick={() => router.push('/select')}
                >
                  Keep character for later
                </button>
              </div>
            ) : (
              <div className={styles.choicePhase}>
                <div className={styles.panelHeader}>
                  <span className={styles.eyebrow}>{selectedWorld?.name}</span>
                  <h1>Which campaign calls to {createdCharacter?.name}?</h1>
                  <p>
                    The character is now part of this World. Choose an active
                    Campaign to enter.
                  </p>
                </div>

                <div className={styles.choiceList}>
                  {campaigns.length > 0 &&
                  worldCharacterId &&
                  selectedWorld ? (
                    campaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        className={styles.choiceCard}
                        type="button"
                        disabled={Boolean(pendingAction)}
                        onClick={() =>
                          void attachCampaign(
                            worldCharacterId,
                            selectedWorld.id,
                            campaign,
                          )
                        }
                      >
                        <span>
                          <strong>{campaign.name}</strong>
                          <small>
                            {campaign.id === targetCampaignId
                              ? 'Suggested campaign'
                              : 'Active campaign'}
                          </small>
                        </span>
                        <span className={styles.choiceAction}>
                          {pendingAction === `campaign:${campaign.id}`
                            ? 'Joining…'
                            : 'Enter Campaign'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <strong>No Campaign is available to join here yet.</strong>
                      <p>
                        {createdCharacter?.name} remains in{' '}
                        {selectedWorld?.name ?? 'this World'} and can join a
                        Campaign later.
                      </p>
                    </div>
                  )}
                </div>

                {error ? <p className={styles.error}>{error}</p> : null}

                <button
                  className={styles.secondaryAction}
                  type="button"
                  onClick={() => router.push('/select')}
                >
                  Finish for now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
