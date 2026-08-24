export type CampaignCreateActor = 'WORLD_OWNER' | 'WORLD_ADMIN' | 'WORLD_MEMBER'

export type CampaignUpdateActor = 'CAMPAIGN_OWNER' | 'WORLD_OWNER'

export type CampaignLifecycleActor = 'CURRENT_CAMPAIGN_OWNER' | 'WORLD_OWNER'

export type CampaignFoundationAction =
  | { action: 'create-campaign'; actor: CampaignCreateActor }
  | { action: 'update-admin-campaign'; actor: CampaignUpdateActor }
  | {
      action:
        | 'transfer-admin-campaign'
        | 'end-admin-campaign'
        | 'archive-admin-campaign'
        | 'delete-admin-campaign'
      actor: CampaignLifecycleActor
    }

export interface CampaignFoundationState {
  world: {
    id: string
    name: string
    ownerId: string | null
  }
  timeline: {
    id: string
    name: string
  }
  people: Array<{
    id: string
    displayName: string | null
    worldRole: 'OWNER' | 'ADMIN' | 'MEMBER'
  }>
  campaigns: Array<{
    id: string
    name: string
    worldId: string | null
    ownerId: string
    timelineId: string | null
    currentWorldPosition: string | null
    currentWorldDateLabel: string | null
    currentLocationId: string | null
    currentFocus: string | null
    status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
    memberships: Array<{
      userId: string
      role: 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'
    }>
  }>
}

export function isCampaignFoundationAction(
  value: unknown,
): value is CampaignFoundationAction {
  if (!value || typeof value !== 'object') return false

  const request = value as Record<string, unknown>
  const keys = Object.keys(request).sort()

  if (keys.length !== 2 || keys[0] !== 'action' || keys[1] !== 'actor') {
    return false
  }

  if (request.action === 'create-campaign') {
    return (
      request.actor === 'WORLD_OWNER' ||
      request.actor === 'WORLD_ADMIN' ||
      request.actor === 'WORLD_MEMBER'
    )
  }

  if (request.action === 'update-admin-campaign') {
    return request.actor === 'CAMPAIGN_OWNER' || request.actor === 'WORLD_OWNER'
  }

  return (
    (request.action === 'transfer-admin-campaign' ||
      request.action === 'end-admin-campaign' ||
      request.action === 'archive-admin-campaign' ||
      request.action === 'delete-admin-campaign') &&
    (request.actor === 'CURRENT_CAMPAIGN_OWNER' ||
      request.actor === 'WORLD_OWNER')
  )
}
