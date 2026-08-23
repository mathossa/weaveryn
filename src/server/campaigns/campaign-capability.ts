import { invalidCampaignCapability } from './campaign-errors'

export const CAMPAIGN_CAPABILITIES = ['UPDATE_CURRENT_LOCATION'] as const

export type CampaignCapability = (typeof CAMPAIGN_CAPABILITIES)[number]

export function isCampaignCapability(
  value: unknown,
): value is CampaignCapability {
  return (
    typeof value === 'string' &&
    CAMPAIGN_CAPABILITIES.includes(value as CampaignCapability)
  )
}

export function assertCampaignCapability(
  value: unknown,
): asserts value is CampaignCapability {
  if (!isCampaignCapability(value)) throw invalidCampaignCapability(value)
}
