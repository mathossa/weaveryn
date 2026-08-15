import { invalidCampaignRole } from './campaign-errors'

export const CAMPAIGN_ROLES = [
  'GM',
  'ASSISTANT_GM',
  'PLAYER',
  'SPECTATOR',
] as const

export type CampaignRole = (typeof CAMPAIGN_ROLES)[number]

export function isCampaignRole(value: unknown): value is CampaignRole {
  return (
    typeof value === 'string' && CAMPAIGN_ROLES.includes(value as CampaignRole)
  )
}

export function assertCampaignRole(
  value: unknown,
): asserts value is CampaignRole {
  if (!isCampaignRole(value)) throw invalidCampaignRole(value)
}
