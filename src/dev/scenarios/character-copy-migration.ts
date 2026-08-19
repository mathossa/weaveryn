export type CharacterCopyMigrationAction =
  | { action: 'copy' }
  | { action: 'try-duplicate-copy' }
  | { action: 'try-migrate-with-participation' }
  | { action: 'resolve-participation' }
  | { action: 'migrate' }

export interface CharacterCopyMigrationState {
  character: { id: string; ownerUserId: string; name: string } | null
  worlds: Array<{ id: string; name: string }>
  worldCharacters: Array<{
    id: string
    worldId: string
    nameOverride: string | null
    worldData: unknown
  }>
  participations: Array<{
    id: string
    worldCharacterId: string
    campaignId: string
  }>
  entities: Array<{
    id: string
    worldId: string
    worldCharacterId: string | null
    type: string
    name: string
  }>
  relationships: Array<{
    id: string
    worldId: string
    sourceEntityId: string
    targetEntityId: string
    relationshipType: string
  }>
}

const actions = new Set<CharacterCopyMigrationAction['action']>([
  'copy',
  'try-duplicate-copy',
  'try-migrate-with-participation',
  'resolve-participation',
  'migrate',
])

export function isCharacterCopyMigrationAction(
  value: unknown,
): value is CharacterCopyMigrationAction {
  if (!value || typeof value !== 'object') return false
  const request = value as Record<string, unknown>
  return (
    Object.keys(request).length === 1 &&
    typeof request.action === 'string' &&
    actions.has(request.action as CharacterCopyMigrationAction['action'])
  )
}
