export type CampaignCharactersScenarioAction =
  | { action: 'player-self-attach' }
  | { action: 'add-first-participation' }
  | { action: 'add-second-participation' }
  | { action: 'update-first-state' }
  | { action: 'try-duplicate-participation' }
  | { action: 'try-cross-world-participation' }
  | { action: 'try-owner-without-membership-update' }
  | { action: 'remove-first-participation' }

export interface CampaignCharactersScenarioState {
  character: { id: string; name: string } | null
  worldCharacter: {
    id: string
    worldId: string
    nameOverride: string | null
  } | null
  campaigns: Array<{ id: string; name: string; worldId: string | null }>
  participations: Array<{
    id: string
    campaignId: string
    sheetData: unknown
    status: string
  }>
}

const actions = new Set<CampaignCharactersScenarioAction['action']>([
  'player-self-attach',
  'add-first-participation',
  'add-second-participation',
  'update-first-state',
  'try-duplicate-participation',
  'try-cross-world-participation',
  'try-owner-without-membership-update',
  'remove-first-participation',
])

export function isCampaignCharactersScenarioAction(
  value: unknown,
): value is CampaignCharactersScenarioAction {
  if (!value || typeof value !== 'object') return false
  const request = value as Record<string, unknown>
  return (
    Object.keys(request).length === 1 &&
    typeof request.action === 'string' &&
    actions.has(request.action as CampaignCharactersScenarioAction['action'])
  )
}
