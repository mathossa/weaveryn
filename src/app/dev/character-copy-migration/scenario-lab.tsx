'use client'

import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  CharacterCopyMigrationAction,
  CharacterCopyMigrationState,
} from '@/dev/scenarios/character-copy-migration'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'

const metadata = requireDevScenarioMetadata('character-copy-migration')
const sourceId = '19000000-0000-4000-8000-0000000000e2'
const copyId = '19000000-0000-4000-8000-0000000000e3'
const actions: Array<{
  action: CharacterCopyMigrationAction['action']
  label: string
}> = [
  { action: 'copy', label: 'Copy to Veyra' },
  { action: 'try-duplicate-copy', label: 'Try duplicate copy' },
  {
    action: 'try-migrate-with-participation',
    label: 'Try migration with participation',
  },
  { action: 'resolve-participation', label: 'Resolve Campaign participation' },
  { action: 'migrate', label: 'Migrate to Nareth' },
]

export function CharacterCopyMigrationLab() {
  const { result, isBusy, perform } = useDevScenario<
    CharacterCopyMigrationState,
    CharacterCopyMigrationAction
  >(metadata.id)
  const state = result?.state
  const source = state?.worldCharacters.find(
    (worldCharacter) => worldCharacter.id === sourceId,
  )
  const copyExists = state?.worldCharacters.some(
    (worldCharacter) => worldCharacter.id === copyId,
  )
  const hasParticipation = state?.participations.some(
    (participation) => participation.worldCharacterId === source?.id,
  )

  function disabled(action: CharacterCopyMigrationAction['action']) {
    if (isBusy || !state) return true
    if (action === 'copy') return Boolean(copyExists)
    if (action === 'try-duplicate-copy') return !copyExists
    if (action === 'try-migrate-with-participation')
      return !source || !hasParticipation
    if (action === 'resolve-participation') return !hasParticipation
    return (
      !source ||
      Boolean(hasParticipation) ||
      source.worldId !== '19000000-0000-4000-8000-0000000000b1'
    )
  }

  return (
    <main className="dev-page">
      <ScenarioNavigation issueNumbers={metadata.issueNumbers} />
      <header>
        <span>Development only · Issues #19 and #117</span>
        <h1>WorldCharacter copy, migration, and entity graph</h1>
        <p>
          Copy creates a fresh Character entity without copying World
          relationships. Migration preserves the incarnation ID, remains blocked
          until Campaign participation is resolved, and leaves the source graph
          behind as an editable Person / NPC snapshot.
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
              <strong>{state.character?.name}</strong> · portable owner{' '}
              <code>{state.character?.ownerUserId}</code>
            </p>
            <h3>WorldCharacters</h3>
            <ul>
              {state.worldCharacters.map((worldCharacter) => (
                <li key={worldCharacter.id}>
                  {
                    state.worlds.find(
                      (world) => world.id === worldCharacter.worldId,
                    )?.name
                  }
                  : <code>{worldCharacter.id}</code> ·{' '}
                  {worldCharacter.nameOverride ?? 'no override'} ·{' '}
                  <code>{JSON.stringify(worldCharacter.worldData)}</code>
                </li>
              ))}
            </ul>
            <p>Campaign participations: {state.participations.length}</p>

            <h3>World entity graph</h3>
            <ul>
              {state.entities.map((entity) => (
                <li key={entity.id}>
                  <strong>{entity.name}</strong> · {entity.type} ·{' '}
                  {
                    state.worlds.find((world) => world.id === entity.worldId)
                      ?.name
                  }
                  {' · '}
                  {entity.worldCharacterId ? (
                    <>
                      linked to <code>{entity.worldCharacterId}</code>
                    </>
                  ) : (
                    'independent World entity'
                  )}
                </li>
              ))}
            </ul>
            <h3>Relationships</h3>
            {state.relationships.length > 0 ? (
              <ul>
                {state.relationships.map((relationship) => (
                  <li key={relationship.id}>
                    <code>{relationship.sourceEntityId}</code> →{' '}
                    <strong>{relationship.relationshipType}</strong> →{' '}
                    <code>{relationship.targetEntityId}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No relationships in the fixture.</p>
            )}
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
            disabled={disabled(item.action)}
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
