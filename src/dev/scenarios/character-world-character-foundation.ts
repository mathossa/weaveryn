export type CharacterFoundationAction =
  | { action: 'create-character' }
  | { action: 'create-second-incarnation' }
  | { action: 'update-character' }
  | { action: 'update-world-character' }
  | { action: 'unauthorized-update' }
  | { action: 'duplicate-incarnation' }

export interface CharacterFoundationState {
  character: {
    id: string
    ownerUserId: string
    name: string
    coreData: unknown
  } | null
  worlds: Array<{ id: string; name: string }>
  worldCharacters: Array<{
    id: string
    worldId: string
    nameOverride: string | null
    worldData: unknown
  }>
}

const actions = new Set<CharacterFoundationAction['action']>([
  'create-character',
  'create-second-incarnation',
  'update-character',
  'update-world-character',
  'unauthorized-update',
  'duplicate-incarnation',
])
export function isCharacterFoundationAction(
  value: unknown,
): value is CharacterFoundationAction {
  if (!value || typeof value !== 'object') return false
  const request = value as Record<string, unknown>
  return (
    Object.keys(request).length === 1 &&
    typeof request.action === 'string' &&
    actions.has(request.action as CharacterFoundationAction['action'])
  )
}
