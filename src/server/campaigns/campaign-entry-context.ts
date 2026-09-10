import type { CampaignOverview } from './campaign-ui-service'

/** Workspace identity is a presentation context, never an authorization grant. */
export function resolveCampaignEntryContext(
  campaign: CampaignOverview,
  input: {
    mode?: string | string[]
    requestedWorldCharacterId?: string
    preferredWorldCharacterId?: string
  },
) {
  const manager =
    campaign.isOwner ||
    campaign.role === 'GM' ||
    campaign.role === 'ASSISTANT_GM'
  if (input.mode === 'weaver' && !manager) return null
  const explicitMode =
    input.mode === 'weaver' || input.mode === 'threadwatcher'
      ? input.mode
      : undefined
  const characterId = explicitMode
    ? undefined
    : (input.requestedWorldCharacterId ?? input.preferredWorldCharacterId)
  const character = characterId
    ? campaign.characters.find(
        (candidate) =>
          candidate.worldCharacterId === characterId &&
          candidate.ownedByCurrentUser,
      )
    : undefined
  // A stale or foreign explicit identity must not silently become Weaver entry.
  if (!explicitMode && input.requestedWorldCharacterId && !character)
    return null
  const mode: 'weaver' | 'threadwalker' | 'threadwatcher' =
    explicitMode ??
    (character
      ? 'threadwalker'
      : manager
        ? 'weaver'
        : campaign.role === 'SPECTATOR'
          ? 'threadwatcher'
          : 'threadwalker')
  const isWeaver = mode === 'weaver'
  return {
    mode,
    character,
    isWeaver,
    canManageCampaign:
      isWeaver &&
      (campaign.canEditSharedInfo ||
        campaign.canEditName ||
        campaign.canManageMembers ||
        campaign.canDelete),
    canUpdateCurrentLocation:
      campaign.canUpdateCurrentLocation &&
      (isWeaver || (mode === 'threadwalker' && campaign.role === 'PLAYER')),
    canUpdateFocus: isWeaver && campaign.canEditSharedInfo,
  }
}
