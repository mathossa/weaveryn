'use client'

import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  WorldEventsAction,
  WorldEventsState,
} from '@/dev/scenarios/world-events'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'

const metadata = requireDevScenarioMetadata('world-events')

export function WorldEventsLab() {
  const { result, isBusy, perform } = useDevScenario<
    WorldEventsState,
    WorldEventsAction
  >(metadata.id)
  const state = result?.state

  return (
    <main className="dev-page">
      <ScenarioNavigation issueNumbers={metadata.issueNumbers} />

      <header>
        <span>Development only · Issue #113</span>
        <h1>World events and main timeline</h1>
        <p>
          Exercise canonical chronology, point and duration events, linked World
          entities, named reckonings, invalid date ranges, and World-role
          authorization through the production WorldEventService.
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
              <strong>{state.world.name}</strong> · {state.timeline.name}
            </p>
            <p>
              Linked entities:{' '}
              {state.entities.map((entity) => entity.name).join(', ')}
            </p>

            <h3>Reckonings</h3>
            {state.reckonings.length ? (
              <ul>
                {state.reckonings.map((reckoning) => (
                  <li key={reckoning.id}>
                    <strong>{reckoning.name}</strong> · anchor{' '}
                    {reckoning.anchorWorldDateLabel} ·{' '}
                    {reckoning.beforeAbbreviation ?? 'before'} /{' '}
                    {reckoning.afterAbbreviation ?? 'after'}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No named year systems configured.</p>
            )}

            <h3>Events in canonical order</h3>
            {state.events.length ? (
              <ol>
                {state.events.map((event) => (
                  <li key={event.id}>
                    <strong>{event.startWorldDateLabel}</strong>
                    {event.endWorldDateLabel
                      ? ` – ${event.endWorldDateLabel}`
                      : ''}{' '}
                    · {event.title} · {event.entityIds.length} linked{' '}
                    {event.entityIds.length === 1 ? 'entity' : 'entities'}
                  </li>
                ))}
              </ol>
            ) : (
              <p>No historical events yet.</p>
            )}
          </>
        ) : (
          <p>Reset the deterministic fixture to begin.</p>
        )}
      </section>

      <section>
        <h2>Real service actions</h2>
        <button
          type="button"
          disabled={isBusy || !state}
          onClick={() =>
            void perform({ action: 'create-point', actor: 'MEMBER' })
          }
        >
          Threadwalker: create point event
        </button>
        <button
          type="button"
          disabled={isBusy || !state}
          onClick={() =>
            void perform({ action: 'create-duration', actor: 'MEMBER' })
          }
        >
          Threadwalker: create duration event
        </button>
        <button
          type="button"
          disabled={isBusy || !state}
          onClick={() =>
            void perform({ action: 'create-invalid-duration', actor: 'MEMBER' })
          }
        >
          Try end-before-start
        </button>
        <button
          type="button"
          disabled={isBusy || !state}
          onClick={() =>
            void perform({ action: 'create-point', actor: 'VIEWER' })
          }
        >
          Threadwatcher: try to create event
        </button>
      </section>

      <ScenarioResultPanels result={result} />
    </main>
  )
}
