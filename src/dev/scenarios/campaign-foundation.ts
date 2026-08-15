export type CampaignCreateActor = 'WORLD_OWNER' | 'WORLD_ADMIN' | 'WORLD_MEMBER'

export type CampaignUpdateActor = 'CAMPAIGN_OWNER' | 'WORLD_OWNER'

export type CampaignFoundationAction =
  | { action: 'create-campaign'; actor: CampaignCreateActor }
  | { action: 'update-admin-campaign'; actor: CampaignUpdateActor }

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
    status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
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

  return (
    request.action === 'update-admin-campaign' &&
    (request.actor === 'CAMPAIGN_OWNER' || request.actor === 'WORLD_OWNER')
  )
}
