import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import {
  requestedCharacterContext,
  withCharacterContext,
} from '@/lib/campaign-context'
import { campaignRoleLabel } from '@/lib/role-labels'
import { requireAuthenticatedUser } from '@/server/auth'
import { getCampaignOverview } from '@/server/campaigns'
import { listEntryPreferences } from '@/server/selection'
import type { CampaignManagementSection } from './campaign-management-sections'

export interface CampaignManagementSearchParams {
  character?: string | string[]
  mode?: string | string[]
}

function characterFromCampaignReferer(
  referer: string | null,
  worldId: string,
  campaignId: string,
) {
  if (!referer) return undefined

  try {
    const url = new URL(referer)
    if (url.pathname !== `/world/${worldId}/campaign/${campaignId}`) {
      return undefined
    }

    return requestedCharacterContext(
      url.searchParams.get('character') ?? undefined,
    )
  } catch {
    return undefined
  }
}

function statusLabel(status: 'ACTIVE' | 'ENDED' | 'ARCHIVED') {
  return status.charAt(0) + status.slice(1).toLocaleLowerCase('en-US')
}

export async function loadCampaignManagementPage(
  params: Promise<{ worldId: string; campaignId: string }>,
  searchParams: Promise<CampaignManagementSearchParams>,
) {
  const [{ worldId, campaignId }, query, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers(),
  ])
  const user = await requireAuthenticatedUser(new Headers(requestHeaders))
  const [campaign, entryPreferences] = await Promise.all([
    getCampaignOverview(worldId, campaignId, user.id),
    listEntryPreferences(user.id),
  ])
  if (!campaign) notFound()

  const canManageCampaign =
    campaign.canEditSharedInfo ||
    campaign.canEditName ||
    campaign.canManageMembers ||
    campaign.canDelete
  if (!canManageCampaign) notFound()

  const explicitWeaverMode = query.mode === 'weaver'
  const requestedCharacterId = requestedCharacterContext(query.character)
  const referredCharacterId = explicitWeaverMode
    ? undefined
    : characterFromCampaignReferer(
        requestHeaders.get('referer'),
        worldId,
        campaignId,
      )
  const latestCampaignPreference =
    requestedCharacterId || referredCharacterId || explicitWeaverMode
      ? undefined
      : entryPreferences
          .filter(
            (preference) =>
              preference.campaignId === campaign.id && preference.lastUsedAt,
          )
          .sort(
            (left, right) =>
              (right.lastUsedAt?.getTime() ?? 0) -
              (left.lastUsedAt?.getTime() ?? 0),
          )[0]
  const preferredCharacterId = explicitWeaverMode
    ? undefined
    : (requestedCharacterId ??
      referredCharacterId ??
      (latestCampaignPreference?.kind === 'CHARACTER'
        ? (latestCampaignPreference.worldCharacterId ?? undefined)
        : undefined))
  const selectedCharacter = preferredCharacterId
    ? campaign.characters.find(
        (character) =>
          character.worldCharacterId === preferredCharacterId &&
          character.ownedByCurrentUser,
      )
    : undefined
  const campaignBaseHref = `/world/${worldId}/campaign/${campaign.id}`
  const campaignHref = explicitWeaverMode
    ? `${campaignBaseHref}?mode=weaver`
    : withCharacterContext(
        campaignBaseHref,
        selectedCharacter?.worldCharacterId,
      )
  const contextSuffix = explicitWeaverMode
    ? '?mode=weaver'
    : selectedCharacter
      ? `?character=${encodeURIComponent(selectedCharacter.worldCharacterId)}`
      : ''
  const manageBaseHref = `${campaignBaseHref}/manage`
  const manageHref = `${manageBaseHref}${contextSuffix}`

  return {
    user,
    campaign,
    worldId,
    campaignHref,
    manageHref,
    managementHref(section: CampaignManagementSection) {
      return `${manageBaseHref}/${section}${contextSuffix}`
    },
    selectedCharacter,
    ownerLabel: campaign.owner.displayName ?? `@${campaign.owner.username}`,
    roleLabel: campaignRoleLabel(campaign.role),
    statusLabel: statusLabel(campaign.status),
    shellContext: {
      world: { label: campaign.world.name, href: `/world/${worldId}` },
      campaign: { label: campaign.name, href: campaignHref },
      ...(selectedCharacter
        ? {
            character: {
              label: selectedCharacter.name,
              href: `/character/${selectedCharacter.worldCharacterId}?campaign=${campaign.id}`,
            },
          }
        : {}),
    },
  }
}

export type CampaignManagementPageData = Awaited<
  ReturnType<typeof loadCampaignManagementPage>
>
