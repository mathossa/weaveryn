'use client'

import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  WorldEntitiesScenarioAction,
  WorldEntitiesScenarioState,
} from '@/dev/scenarios/world-entities'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'

const metadata = requireDevScenarioMetadata('world-entities')
const locationId = '20000000-0000-4000-8000-000000000010'
const organizationId = '20000000-0000-4000-8000-000000000011'
const otherWorldEntityId = '20000000-0000-4000-8000-000000000012'
const campaignEntityId = '20000000-0000-4000-8000-000000000014'

const actions: Array<{
  action: WorldEntitiesScenarioAction['action']
  label: string
}> = [
  { action: 'create-entities', label: 'Create World entities' },
  {
    action: 'create-visibility-entities',
    label: 'Create MVP visibility + custom type examples',
  },
  { action: 'update-entity', label: 'Edit Moonwatch' },
  { action: 'link-entities', label: 'Link Moonwatch to Lantern Guild' },
  {
    action: 'delete-relationship',
    label: 'Delete relationship, preserve entities',
  },
  { action: 'cross-world-link', label: 'Try cross-World relationship' },
  { action: 'unauthorized-create', label: 'Try VIEWER create' },
]

export function WorldEntitiesLab() {
  const { result, isBusy, perform } = useDevScenario<
    WorldEntitiesScenarioState,
    WorldEntitiesScenarioAction
  >(metadata.id)
  const state = result?.state
  const entityIds = new Set(state?.entities.map((entity) => entity.id) ?? [])
  const hasPrimaryEntities =
    entityIds.has(locationId) && entityIds.has(organizationId)
  const hasCrossWorldEntity = entityIds.has(otherWorldEntityId)
  const hasVisibilityEntities = entityIds.has(campaignEntityId)
  const hasWorldRelationship = Boolean(
    state?.relationships.some(
      (relationship) => relationship.relationshipType === 'HOSTS',
    ),
  )

  function isDisabled(action: WorldEntitiesScenarioAction['action']) {
    if (isBusy || !state) return true
    if (action === 'create-entities') return state.entities.length > 0
    if (action === 'create-visibility-entities') return hasVisibilityEntities
    if (action === 'update-entity') return !entityIds.has(locationId)
    if (action === 'link-entities') {
      return !hasPrimaryEntities || hasWorldRelationship
    }
    if (action === 'delete-relationship') return !hasWorldRelationship
    if (action === 'cross-world-link') {
      return !hasPrimaryEntities || !hasCrossWorldEntity
    }
    return false
  }

  return (
    <main className="dev-page">
      <ScenarioNavigation issueNumbers={metadata.issueNumbers} />
      <header>
        <span>Development only · Issues #20 and #55</span>
        <h1>World entities and relationships</h1>
        <p>
          Exercise generic World content, simple structured data, reusable
          custom types, MVP visibility, explicit graph relationships, same-World
          validation, and backend authorization.
        </p>
      </header>
      <ScenarioLifecycleControls
        isBusy={isBusy}
        hasFixture={Boolean(state)}
        onAction={(action) => void perform({ action })}
      />
      <section>
        <h2>Fixture state</h2>
        {state ? (
          <>
            <p>
              Worlds:{' '}
              <strong>
                {state.worlds.map((world) => world.name).join(', ')}
              </strong>
            </p>
            <h3>Entities</h3>
            <ul>
              {state.entities.map((entity) => (
                <li key={entity.id}>
                  <strong>{entity.name}</strong> · {entity.type} ·{' '}
                  <strong>{entity.visibilityScope}</strong> ·{' '}
                  <code>{JSON.stringify(entity.data)}</code>
                </li>
              ))}
            </ul>
            <h3>Reusable custom types</h3>
            <ul>
              {state.entityTypes.map((entityType) => (
                <li key={entityType.id}>
                  <strong>{entityType.name}</strong> ·{' '}
                  {entityType.campaignId ? 'Campaign' : 'World'} scope
                </li>
              ))}
            </ul>
            <h3>Relationships</h3>
            <ul>
              {state.relationships.map((relationship) => (
                <li key={relationship.id}>
                  {relationship.sourceEntityId} → {relationship.targetEntityId}{' '}
                  · <strong>{relationship.relationshipType}</strong> ·{' '}
                  {relationship.visibilityScope}
                  {relationship.label ? ` · ${relationship.label}` : ''}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Reset the deterministic fixture to begin.</p>
        )}
      </section>
      <section>
        <h2>Real service actions</h2>
        {actions.map((item) => (
          <button
            key={item.action}
            type="button"
            disabled={isDisabled(item.action)}
            onClick={() => void perform({ action: item.action })}
          >
            {item.label}
          </button>
        ))}
      </section>
      <ScenarioResultPanels result={result} />
    </main>
  )
}
