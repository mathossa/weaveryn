'use client'

import { useState } from 'react'
import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  WorldUpdateAction,
  WorldUpdateState,
} from '@/dev/scenarios/world-update-example'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'
import styles from './world-update-example.module.css'

const metadata = requireDevScenarioMetadata('world-update-example')

export function WorldUpdateExampleLab() {
  const [actor, setActor] = useState<'OWNER' | 'OUTSIDER'>('OWNER')
  const { result, isBusy, perform } = useDevScenario<
    WorldUpdateState,
    WorldUpdateAction
  >(metadata.id)
  const world = result?.state ?? null

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <ScenarioNavigation issueNumbers={metadata.issueNumbers} />

        <header className={styles.header}>
          <span>Development only · Shared contract example</span>
          <h1>World update scenario</h1>
          <p>
            This small second scenario proves a feature can reuse production
            guards, database isolation, lifecycle actions, error envelopes, and
            acceptance reporting without copying the infrastructure.
          </p>
        </header>

        <ScenarioLifecycleControls
          isBusy={isBusy}
          hasFixture={Boolean(world)}
          onAction={(action) => void perform({ action })}
        />

        <div className={styles.workspace}>
          <section
            className={styles.stateCard}
            aria-labelledby="world-update-state"
          >
            <span>Persisted state</span>
            <h2 id="world-update-state">
              {world?.name ?? 'No example World yet'}
            </h2>
            {world ? (
              <dl>
                <div>
                  <dt>World ID</dt>
                  <dd>{world.id}</dd>
                </div>
                <div>
                  <dt>Owner ID</dt>
                  <dd>{world.ownerId}</dd>
                </div>
              </dl>
            ) : (
              <p>
                Create the deterministic fixture to enable the manual action.
              </p>
            )}
          </section>

          <section
            className={styles.actionCard}
            aria-labelledby="world-update-action"
          >
            <span>Real service action</span>
            <h2 id="world-update-action">Rename the World</h2>
            <p>
              The owner succeeds. The outsider is rejected by the existing World
              service and the name stays unchanged.
            </p>
            <label htmlFor="update-actor">Acting user</label>
            <select
              id="update-actor"
              value={actor}
              disabled={isBusy}
              onChange={(event) =>
                setActor(event.target.value as 'OWNER' | 'OUTSIDER')
              }
            >
              <option value="OWNER">Uma · World owner</option>
              <option value="OUTSIDER">Oren · Outsider (should fail)</option>
            </select>
            <button
              type="button"
              disabled={isBusy || !world}
              onClick={() => void perform({ action: 'rename', actor })}
            >
              {isBusy ? 'Working…' : 'Rename to The Moonlit Archive'}
            </button>
          </section>
        </div>

        <ScenarioResultPanels result={result} />
      </div>
    </main>
  )
}
