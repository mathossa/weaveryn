export type WorldEntitiesScenarioAction =
  | { action: 'create-entities' }
  | { action: 'create-visibility-entities' }
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
    image: string | null
    data: unknown
    visibilityScope: 'WORLD' | 'CAMPAIGN' | 'GM' | 'PLAYER' | 'PRIVATE'
    visibilityCampaignId: string | null
    visibilityUserId: string | null
    createdById: string | null
  }>
  relationships: Array<{
    id: string
    worldId: string
    sourceEntityId: string
    targetEntityId: string
    relationshipType: string
    label: string | null
    metadata: unknown
    visibilityScope: 'WORLD' | 'CAMPAIGN' | 'GM' | 'PLAYER' | 'PRIVATE'
  }>
  entityTypes: Array<{
    id: string
    worldId: string
    campaignId: string | null
    name: string
  }>
}

const actions = new Set<WorldEntitiesScenarioAction['action']>([
  'create-entities',
  'create-visibility-entities',
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
