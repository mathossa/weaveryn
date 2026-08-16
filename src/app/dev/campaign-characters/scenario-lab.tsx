'use client'

import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  CampaignCharactersScenarioAction,
  CampaignCharactersScenarioState,
} from '@/dev/scenarios/campaign-characters'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'

const metadata = requireDevScenarioMetadata('campaign-characters')

const actions: Array<{
  action: CampaignCharactersScenarioAction['action']
  label: string
}> = [
  {
    action: 'player-self-attach',
    label: 'Player attaches own Character',
  },
  {
    action: 'add-first-participation',
    label: 'GM adds first Campaign participation',
  },
  {
    action: 'add-second-participation',
    label: 'Add second Campaign participation',
  },
  { action: 'update-first-state', label: 'Update first Campaign state' },
  {
    action: 'try-duplicate-participation',
    label: 'Try duplicate participation',
  },
  {
    action: 'try-cross-world-participation',
    label: 'Try cross-World participation',
  },
  {
    action: 'try-owner-without-membership-update',
    label: 'Try owner update without Campaign access',
  },
  {
    action: 'remove-first-participation',
    label: 'Remove first participation only',
  },
]

export function CampaignCharactersLab() {
  const { result, isBusy, perform } = useDevScenario<
    CampaignCharactersScenarioState,
    CampaignCharactersScenarioAction
  >(metadata.id)
  const state = result?.state
  const first = state?.participations.find(
    (record) => record.campaignId === '18000000-0000-4000-8000-0000000000d1',
  )
  const second = state?.participations.find(
    (record) => record.campaignId === '18000000-0000-4000-8000-0000000000d2',
  )

  function disabled(action: CampaignCharactersScenarioAction['action']) {
    if (isBusy || !state) return true
    if (
      action === 'player-self-attach' ||
      action === 'add-first-participation'
    )
      return Boolean(first)
    if (action === 'add-second-participation') return Boolean(second)
    if (
      action === 'update-first-state' ||
      action === 'try-duplicate-participation' ||
      action === 'remove-first-participation'
    )
      return !first
    if (action === 'try-owner-without-membership-update') return !second
    return false
  }

  return (
    <main className="dev-page">
      <ScenarioNavigation issueNumbers={metadata.issueNumbers} />
      <header>
        <span>Development only · Issues #18 and #54</span>
        <h1>CampaignCharacter participation and state</h1>
        <p>
          Observe one WorldCharacter joining multiple Campaigns in its World,
          including a PLAYER attaching their own Character after Campaign
          membership exists, with independent generic state and service-enforced
          authorization.
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
              <strong>{state.character?.name}</strong> · WorldCharacter{' '}
              <code>{state.worldCharacter?.nameOverride}</code>
            </p>
            <ul>
              {state.campaigns.map((campaign) => {
                const participation = state.participations.find(
                  (record) => record.campaignId === campaign.id,
                )
                return (
                  <li key={campaign.id}>
                    <strong>{campaign.name}</strong>:{' '}
                    {participation ? (
                      <>
                        <code>{JSON.stringify(participation.sheetData)}</code> ·{' '}
                        {participation.status}
                      </>
                    ) : (
                      'not participating'
                    )}
                  </li>
                )
              })}
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
