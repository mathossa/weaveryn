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
    (worldCharacter) =>
      worldCharacter.id === '19000000-0000-4000-8000-0000000000e2',
  )
  const copyExists = state?.worldCharacters.some(
    (worldCharacter) =>
      worldCharacter.id === '19000000-0000-4000-8000-0000000000e3',
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
        <span>Development only · Issue #19</span>
        <h1>WorldCharacter copy and migration</h1>
        <p>
          Copy uses explicit target data. Migration preserves the incarnation ID
          and remains blocked until Campaign participation is resolved.
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
