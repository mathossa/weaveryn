export const CAMPAIGN_MANAGEMENT_SECTIONS = [
  'details',
  'members',
  'characters',
  'time',
  'advanced',
] as const

export type CampaignManagementSection =
  (typeof CAMPAIGN_MANAGEMENT_SECTIONS)[number]

interface CampaignManagementCapabilities {
  canEditSharedInfo: boolean
  canManageMembers: boolean
  canDelete: boolean
}

export function availableCampaignManagementSections(
  capabilities: CampaignManagementCapabilities,
): CampaignManagementSection[] {
  return [
    ...(capabilities.canEditSharedInfo ? (['details'] as const) : []),
    ...(capabilities.canManageMembers ? (['members'] as const) : []),
    ...(capabilities.canEditSharedInfo
      ? (['characters', 'time'] as const)
      : []),
    ...(capabilities.canDelete ? (['advanced'] as const) : []),
  ]
}
