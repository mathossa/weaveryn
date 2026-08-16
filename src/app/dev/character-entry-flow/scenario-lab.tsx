'use client'

import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  CharacterEntryFlowAction,
  CharacterEntryFlowState,
} from '@/dev/scenarios/character-entry-flow'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'

const metadata = requireDevScenarioMetadata('character-entry-flow')

export function CharacterEntryFlowLab() {
  const { result, isBusy, perform } = useDevScenario<
    CharacterEntryFlowState,
    CharacterEntryFlowAction
  >(metadata.id)
  const state = result?.state

  return (
    <main className="dev-page">
      <ScenarioNavigation issueNumbers={metadata.issueNumbers} />
      <header>
        <span>Development only · Issue #54</span>
        <h1>Invited player Character entry flow</h1>
        <p>
          Verify that a PLAYER invited to a Campaign can create their own
          WorldCharacter in that Campaign&apos;s World and then attach it to the
          Campaign, without receiving general World editing rights.
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
          <ul>
            <li>
              Player: <strong>{state.player.displayName}</strong>
            </li>
            <li>
              World: <strong>{state.world.name}</strong>
            </li>
            <li>
              Campaign: <strong>{state.campaign.name}</strong> ·{' '}
              {state.campaign.role}
            </li>
            <li>
              Portable Character: <strong>{state.character.name}</strong>
            </li>
            <li>
              WorldMembership:{' '}
              <strong>{state.hasWorldMembership ? 'present' : 'none'}</strong>
            </li>
            <li>
              WorldCharacter:{' '}
              {state.worldCharacter ? (
                <strong>
                  {state.worldCharacter.nameOverride ?? state.character.name}
                </strong>
              ) : (
                'not created'
              )}
            </li>
            <li>
              CampaignCharacter:{' '}
              {state.participation ? (
                <strong>{state.participation.status}</strong>
              ) : (
                'not attached'
              )}
            </li>
          </ul>
        ) : (
          <p>Reset the deterministic fixture to begin.</p>
        )}
      </section>

      <section>
        <h2>Real service actions</h2>
        <button
          type="button"
          disabled={isBusy || !state || Boolean(state.worldCharacter)}
          onClick={() => void perform({ action: 'create-world-character' })}
        >
          Create own WorldCharacter
        </button>
        <button
          type="button"
          disabled={
            isBusy ||
            !state?.worldCharacter ||
            Boolean(state.participation)
          }
          onClick={() => void perform({ action: 'attach-to-campaign' })}
        >
          Attach own Character to Campaign
        </button>
      </section>

      <ScenarioResultPanels result={result} />
    </main>
  )
}
