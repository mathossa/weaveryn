export type CharacterEntryFlowAction =
  | { action: 'create-world-character' }
  | { action: 'attach-to-campaign' }

export interface CharacterEntryFlowState {
  player: { id: string; displayName: string | null }
  world: { id: string; name: string; ownerId: string | null }
  campaign: { id: string; name: string; role: 'PLAYER' }
  character: { id: string; name: string }
  hasWorldMembership: boolean
  worldCharacter: {
    id: string
    worldId: string
    nameOverride: string | null
  } | null
  participation: {
    id: string
    campaignId: string
    worldCharacterId: string
    status: string
  } | null
}

const actions = new Set<CharacterEntryFlowAction['action']>([
  'create-world-character',
  'attach-to-campaign',
])

export function isCharacterEntryFlowAction(
  value: unknown,
): value is CharacterEntryFlowAction {
  if (!value || typeof value !== 'object') return false
  const request = value as Record<string, unknown>
  return (
    Object.keys(request).length === 1 &&
    typeof request.action === 'string' &&
    actions.has(request.action as CharacterEntryFlowAction['action'])
  )
}
