export type OrphanedWorldLifecycleActor =
  'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'CAMPAIGN_OWNER' | 'CAMPAIGN_MEMBER'

export type OrphanedWorldLifecycleAction =
  | { action: 'relinquish' }
  | {
      action: 'claim'
      actor: Exclude<OrphanedWorldLifecycleActor, 'OWNER'>
    }
  | { action: 'cleanup' }

export interface OrphanedWorldLifecycleScenarioState {
  world: {
    id: string
    name: string
    ownerId: string | null
    timelineId: string
  } | null
  worldMemberships: Array<{
    userId: string
    role: 'ADMIN' | 'MEMBER' | 'VIEWER'
  }>
  campaigns: Array<{
    id: string
    ownerId: string
    status: 'ACTIVE' | 'ENDED' | 'ARCHIVED'
    worldId: string | null
    timelineId: string | null
    memberships: Array<{ userId: string; role: string }>
  }>
}

export function isOrphanedWorldLifecycleAction(
  value: unknown,
): value is OrphanedWorldLifecycleAction {
  if (!value || typeof value !== 'object') return false
  const request = value as Record<string, unknown>
  const keys = Object.keys(request).sort().join(',')

  if (request.action === 'relinquish' || request.action === 'cleanup') {
    return keys === 'action'
  }

  return (
    request.action === 'claim' &&
    keys === 'action,actor' &&
    ['ADMIN', 'MEMBER', 'VIEWER', 'CAMPAIGN_OWNER', 'CAMPAIGN_MEMBER'].includes(
      request.actor as string,
    )
  )
}
