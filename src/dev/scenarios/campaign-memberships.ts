import type { CampaignRole } from '@/server/campaigns'

export type CampaignMembershipScenarioActor =
  'OWNER' | 'GM' | 'ASSISTANT_GM' | 'PLAYER' | 'SPECTATOR'

export type CampaignMembershipScenarioAction =
  | { action: 'add'; role: CampaignRole }
  | { action: 'change-player-to-assistant' }
  | { action: 'remove-spectator' }
  | { action: 'duplicate-player' }
  | {
      action: 'unauthorized-add'
      actor: Exclude<CampaignMembershipScenarioActor, 'OWNER'>
    }

export interface CampaignMembershipsScenarioState {
  campaign: { id: string; name: string; ownerId: string }
  people: Array<{ id: string; displayName: string | null; key: string }>
  memberships: Array<{ userId: string; role: CampaignRole }>
}

const roles: readonly CampaignRole[] = [
  'GM',
  'ASSISTANT_GM',
  'PLAYER',
  'SPECTATOR',
]

export function isCampaignMembershipScenarioAction(
  value: unknown,
): value is CampaignMembershipScenarioAction {
  if (!value || typeof value !== 'object') return false
  const request = value as Record<string, unknown>
  const keys = Object.keys(request).sort()
  if (request.action === 'add') {
    return (
      keys.join(',') === 'action,role' &&
      roles.includes(request.role as CampaignRole)
    )
  }
  if (
    request.action === 'change-player-to-assistant' ||
    request.action === 'remove-spectator' ||
    request.action === 'duplicate-player'
  )
    return keys.length === 1
  return (
    request.action === 'unauthorized-add' &&
    keys.join(',') === 'action,actor' &&
    ['GM', 'ASSISTANT_GM', 'PLAYER', 'SPECTATOR'].includes(
      request.actor as string,
    )
  )
}
