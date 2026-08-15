export type WorldEntitiesScenarioAction =
  | { action: 'create-entities' }
  | { action: 'update-entity' }
  | { action: 'link-entities' }
  | { action: 'delete-relationship' }
  | { action: 'cross-world-link' }
  | { action: 'unauthorized-create' }

export interface WorldEntitiesScenarioState {
  worlds: Array<{ id: string; name: string }>
  entities: Array<{
    id: string
    worldId: string
    type: string
    name: string
    data: unknown
  }>
  relationships: Array<{
    id: string
    worldId: string
    sourceEntityId: string
    targetEntityId: string
    relationshipType: string
    label: string | null
    metadata: unknown
  }>
}

const actions = new Set<WorldEntitiesScenarioAction['action']>([
  'create-entities',
  'update-entity',
  'link-entities',
  'delete-relationship',
  'cross-world-link',
  'unauthorized-create',
])

export function isWorldEntitiesScenarioAction(
  value: unknown,
): value is WorldEntitiesScenarioAction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    Object.keys(record).length === 1 &&
    typeof record.action === 'string' &&
    actions.has(record.action as WorldEntitiesScenarioAction['action'])
  )
}
