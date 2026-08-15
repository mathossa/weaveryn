'use client'

import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  CharacterFoundationAction,
  CharacterFoundationState,
} from '@/dev/scenarios/character-world-character-foundation'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'

const metadata = requireDevScenarioMetadata(
  'character-world-character-foundation',
)
const actions: Array<{
  action: CharacterFoundationAction['action']
  label: string
}> = [
  { action: 'create-character', label: 'Create portable Character' },
  {
    action: 'update-world-character',
    label: 'Create or update Aldorath incarnation',
  },
  { action: 'create-second-incarnation', label: 'Create Veyra incarnation' },
  { action: 'update-character', label: 'Update portable Character' },
  { action: 'unauthorized-update', label: 'Try unauthorised update' },
  {
    action: 'duplicate-incarnation',
    label: 'Try duplicate Aldorath incarnation',
  },
]

export function CharacterWorldCharacterFoundationLab() {
  const { result, isBusy, perform } = useDevScenario<
    CharacterFoundationState,
    CharacterFoundationAction
  >(metadata.id)
  const state = result?.state
  return (
    <main className="dev-page">
      <ScenarioNavigation issueNumbers={metadata.issueNumbers} />
      <header>
        <span>Development only · Issue #17</span>
        <h1>Character and WorldCharacter foundation</h1>
        <p>
          Observe portable user-owned identity separately from World-specific
          incarnations. All actions call the real CharacterService.
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
              <strong>{state.character?.name}</strong> · owner{' '}
              {state.character?.ownerUserId}
            </p>
            <p>
              Portable data:{' '}
              <code>{JSON.stringify(state.character?.coreData)}</code>
            </p>
            <ul>
              {state.worldCharacters.map((worldCharacter) => (
                <li key={worldCharacter.id}>
                  {
                    state.worlds.find(
                      (world) => world.id === worldCharacter.worldId,
                    )?.name
                  }
                  : override{' '}
                  <code>{worldCharacter.nameOverride ?? 'none'}</code>; World
                  data <code>{JSON.stringify(worldCharacter.worldData)}</code>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Reset the deterministic fixture, then create the Character.</p>
        )}
      </section>
      <section>
        <h2>Real service actions</h2>
        {actions.map((item) => (
          <button
            key={item.action}
            type="button"
            disabled={isBusy || (!state && item.action !== 'create-character')}
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
