import { listOwnedCharacterChoices } from '@/server/characters'
import { getWorldCampaignSelection } from '@/server/campaigns'
import { listWorldNavigationChoices } from '@/server/worlds'

export type ContextNavigationKind = 'world' | 'campaign' | 'character'
export type ContextNavigationMode = 'weaver' | 'threadwatcher'

export type ContextNavigationTracking =
  | {
      kind: 'CHARACTER'
      worldCharacterId: string
      campaignId?: string | null
    }
  | {
      kind: 'WEAVER'
      worldId: string
      campaignId?: string | null
    }

export interface ContextNavigationInput {
  kind: ContextNavigationKind
  worldId?: string
  campaignId?: string
  worldCharacterId?: string
  mode?: ContextNavigationMode
}

export interface ContextNavigationOption {
  id: string
  label: string
  href: string
  active: boolean
  meta?: string
  tracking?: ContextNavigationTracking
}

export class ContextNavigationDomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContextNavigationDomainError'
  }
}

function optionalParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key)?.trim()
  return value || undefined
}

export function parseContextNavigationInput(
  searchParams: URLSearchParams,
): ContextNavigationInput {
  const kind = optionalParam(searchParams, 'kind')
  if (kind !== 'world' && kind !== 'campaign' && kind !== 'character') {
    throw new ContextNavigationDomainError(
      'Context navigation kind must be world, campaign, or character.',
    )
  }

  const modeParam = optionalParam(searchParams, 'mode')
  let mode: ContextNavigationMode | undefined
  if (modeParam) {
    if (modeParam !== 'weaver' && modeParam !== 'threadwatcher') {
      throw new ContextNavigationDomainError(
        'Context navigation mode must be weaver or threadwatcher.',
      )
    }
    mode = modeParam
  }

  return {
    kind,
    worldId: optionalParam(searchParams, 'worldId'),
    campaignId: optionalParam(searchParams, 'campaignId'),
    worldCharacterId: optionalParam(searchParams, 'worldCharacterId'),
    mode,
  }
}

export function buildWorldContextHref(
  worldId: string,
  mode?: ContextNavigationMode,
) {
  if (mode === 'weaver') return `/world/${worldId}?mode=weaver`
  if (mode === 'threadwatcher') {
    return `/world/${worldId}/campaign?mode=threadwatcher`
  }
  return `/world/${worldId}`
}

export function buildCampaignContextHref(input: {
  worldId: string
  campaignId: string
  worldCharacterId?: string
  mode?: ContextNavigationMode
}) {
  const base = `/world/${input.worldId}/campaign/${input.campaignId}`
  if (input.mode === 'weaver') return `${base}?mode=weaver`
  if (input.mode === 'threadwatcher') return `${base}?mode=threadwatcher`
  if (input.worldCharacterId) {
    return `${base}?character=${encodeURIComponent(input.worldCharacterId)}`
  }
  return base
}

export function buildCharacterContextHref(input: {
  worldId: string
  worldCharacterId: string
  campaignId?: string
}) {
  if (input.campaignId) {
    return `/world/${input.worldId}/campaign/${input.campaignId}?character=${encodeURIComponent(input.worldCharacterId)}`
  }
  return `/character/${input.worldCharacterId}`
}

function campaignMeta(campaign: {
  role: 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'
  isOwner: boolean
  status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
}) {
  const role = campaign.isOwner
    ? 'Weaver (Owner)'
    : campaign.role === 'GM'
      ? 'Weaver'
      : campaign.role === 'ASSISTANT_GM'
        ? 'Assistant Weaver'
        : campaign.role === 'PLAYER'
          ? 'Threadwalker'
          : 'Threadwatcher'
  return `${role} · ${campaign.status}`
}

async function listWorldOptions(
  userId: string,
  input: ContextNavigationInput,
): Promise<ContextNavigationOption[]> {
  const worlds = await listWorldNavigationChoices(userId)
  const available = worlds.filter((world) =>
    input.mode === 'weaver'
      ? world.canWeave
      : input.mode === 'threadwatcher'
        ? world.canThreadwatch
        : true,
  )

  return available.map((world) => ({
    id: world.id,
    label: world.name,
    href: buildWorldContextHref(world.id, input.mode),
    active: world.id === input.worldId,
    meta:
      input.mode === 'weaver'
        ? 'Weaver access'
        : input.mode === 'threadwatcher'
          ? 'Threadwatcher access'
          : world.accessKind.replaceAll('_', ' ').toLowerCase(),
    tracking:
      input.mode === 'weaver'
        ? { kind: 'WEAVER', worldId: world.id }
        : undefined,
  }))
}

async function listCampaignOptions(
  userId: string,
  input: ContextNavigationInput,
): Promise<ContextNavigationOption[]> {
  if (!input.worldId) return []
  const worldId = input.worldId

  const [selection, ownedCharacters] = await Promise.all([
    getWorldCampaignSelection(worldId, userId),
    input.worldCharacterId && !input.mode
      ? listOwnedCharacterChoices(userId)
      : Promise.resolve([]),
  ])
  if (!selection) return []

  const currentWorldCharacter = input.worldCharacterId
    ? ownedCharacters
        .flatMap((character) => character.worldCharacters)
        .find(
          (worldCharacter) =>
            worldCharacter.id === input.worldCharacterId &&
            worldCharacter.world.id === worldId,
        )
    : undefined

  const campaigns = selection.campaigns.filter((campaign) =>
    input.mode === 'weaver'
      ? campaign.isOwner ||
        campaign.role === 'GM' ||
        campaign.role === 'ASSISTANT_GM'
      : input.mode === 'threadwatcher'
        ? campaign.role === 'SPECTATOR'
        : true,
  )

  return campaigns.map((campaign) => {
    const preservedWorldCharacterId =
      !input.mode &&
      currentWorldCharacter?.campaignIds.includes(campaign.id)
        ? currentWorldCharacter.id
        : undefined

    return {
      id: campaign.id,
      label: campaign.name,
      href: buildCampaignContextHref({
        worldId,
        campaignId: campaign.id,
        worldCharacterId: preservedWorldCharacterId,
        mode: input.mode,
      }),
      active: campaign.id === input.campaignId,
      meta: campaignMeta(campaign),
      tracking:
        input.mode === 'weaver'
          ? {
              kind: 'WEAVER' as const,
              worldId,
              campaignId: campaign.id,
            }
          : preservedWorldCharacterId
            ? {
                kind: 'CHARACTER' as const,
                worldCharacterId: preservedWorldCharacterId,
                campaignId: campaign.id,
              }
            : undefined,
    }
  })
}

async function listCharacterOptions(
  userId: string,
  input: ContextNavigationInput,
): Promise<ContextNavigationOption[]> {
  if (!input.worldId || input.mode === 'threadwatcher') return []
  const worldId = input.worldId

  const characters = await listOwnedCharacterChoices(userId)
  const options = characters.flatMap((character) =>
    character.worldCharacters
      .filter(
        (worldCharacter) =>
          worldCharacter.world.id === worldId &&
          (!input.campaignId ||
            worldCharacter.campaignIds.includes(input.campaignId)),
      )
      .map((worldCharacter) => ({
        id: worldCharacter.id,
        label: worldCharacter.name,
        href: buildCharacterContextHref({
          worldId,
          worldCharacterId: worldCharacter.id,
          campaignId: input.campaignId,
        }),
        active: worldCharacter.id === input.worldCharacterId,
        meta:
          worldCharacter.name === character.name
            ? worldCharacter.world.name
            : `${character.name} · ${worldCharacter.world.name}`,
        tracking: input.campaignId
          ? ({
              kind: 'CHARACTER',
              worldCharacterId: worldCharacter.id,
              campaignId: input.campaignId,
            } satisfies ContextNavigationTracking)
          : worldCharacter.campaignIds.length === 0
            ? ({
                kind: 'CHARACTER',
                worldCharacterId: worldCharacter.id,
              } satisfies ContextNavigationTracking)
            : undefined,
      })),
  )

  return options.sort(
    (left, right) =>
      left.label.localeCompare(right.label, undefined, {
        sensitivity: 'base',
      }) || left.id.localeCompare(right.id),
  )
}

export async function listContextNavigationOptions(
  userId: string,
  input: ContextNavigationInput,
): Promise<ContextNavigationOption[]> {
  if (input.kind === 'world') return listWorldOptions(userId, input)
  if (input.kind === 'campaign') return listCampaignOptions(userId, input)
  return listCharacterOptions(userId, input)
}
