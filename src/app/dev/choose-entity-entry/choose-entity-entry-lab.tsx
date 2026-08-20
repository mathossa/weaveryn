'use client'

import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  ChooseEntityEntryAction,
  ChooseEntityEntryState,
} from '@/dev/scenarios/choose-entity-entry'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'
import styles from './choose-entity-entry.module.css'

const metadata = requireDevScenarioMetadata('choose-entity-entry')

export function ChooseEntityEntryLab() {
  const { result, isBusy, perform } = useDevScenario<
    ChooseEntityEntryState,
    ChooseEntityEntryAction
  >(metadata.id)
  const state = result?.state ?? null

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <ScenarioNavigation issueNumbers={metadata.issueNumbers} />

        <header className={styles.header}>
          <span>Development only · Choose Entity</span>
          <h1>Entry preference scenario</h1>
          <p>
            Inspect Character Campaign entries, Weaver resume behavior, and the
            Threadwatcher World → Campaign selection path through production
            queries.
          </p>
        </header>

        <ScenarioLifecycleControls
          isBusy={isBusy}
          hasFixture={Boolean(state)}
          onAction={(action) => void perform({ action })}
        />

        <div className={styles.workspace}>
          <section className={styles.panel}>
            <span>Selection state</span>
            <h2>{state?.worldCharacter?.name ?? 'No fixture yet'}</h2>
            {state?.worldCharacter ? (
              <>
                <p>{state.worldCharacter.worldName}</p>
                <ul>
                  {state.worldCharacter.campaigns.map((campaign) => (
                    <li key={campaign.id}>{campaign.name}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>
                Reset the fixture to create the deterministic entry contexts.
              </p>
            )}
          </section>

          <section className={styles.panel}>
            <span>Real service actions</span>
            <h2>Entry metadata</h2>
            <div className={styles.actions}>
              <button
                type="button"
                disabled={isBusy || !state}
                onClick={() => void perform({ action: 'pin-first-campaign' })}
              >
                Pin Verdant Vale
              </button>
              <button
                type="button"
                disabled={isBusy || !state}
                onClick={() => void perform({ action: 'use-second-campaign' })}
              >
                Use War of the Lance
              </button>
              <button
                type="button"
                disabled={isBusy || !state}
                onClick={() =>
                  void perform({ action: 'use-weaver-second-campaign' })
                }
              >
                Resume War as Weaver
              </button>
            </div>
          </section>
        </div>

        {state?.threadwatcher ? (
          <section className={styles.preferences}>
            <h2>Threadwatcher navigation state</h2>
            <article>
              <strong>{state.threadwatcher.worldName}</strong>
              <span>
                World access: {state.threadwatcher.worldAccessKind} · selectable:{' '}
                {String(state.threadwatcher.canThreadwatch)}
              </span>
              <span>
                Campaigns:{' '}
                {state.threadwatcher.campaigns
                  .map((campaign) => `${campaign.name} (${campaign.role})`)
                  .join(', ')}
              </span>
            </article>
          </section>
        ) : null}

        {state?.preferences.length ? (
          <section className={styles.preferences}>
            <h2>Persisted entry preferences</h2>
            {state.preferences.map((preference) => (
              <article key={preference.entryKey}>
                <strong>{preference.entryKey}</strong>
                <span>pinned: {String(preference.pinned)}</span>
                <span>last used: {preference.lastUsedAt ?? 'never'}</span>
              </article>
            ))}
          </section>
        ) : null}

        <ScenarioResultPanels result={result} />
      </div>
    </main>
  )
}
