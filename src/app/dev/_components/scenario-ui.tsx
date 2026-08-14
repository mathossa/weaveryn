'use client'

import Link from 'next/link'
import type { DevScenarioResponse } from '@/server/dev-scenarios/contracts'
import styles from './scenario-ui.module.css'

export function ScenarioNavigation({ issueNumbers }: { issueNumbers: number[] }) {
  return (
    <nav className={styles.navigation} aria-label="Development scenario navigation">
      <Link href="/dev">← Development hub</Link>
      <span>
        {issueNumbers.map((number) => `#${number}`).join(' · ')}
      </span>
    </nav>
  )
}

export function ScenarioLifecycleControls({
  isBusy,
  hasFixture,
  onAction,
}: {
  isBusy: boolean
  hasFixture: boolean
  onAction: (action: 'reset' | 'run-all' | 'cleanup') => void
}) {
  function performLifecycleAction(action: 'reset' | 'run-all' | 'cleanup') {
    if (
      action === 'cleanup' &&
      !window.confirm(
        'Remove this scenario’s namespaced fixture data? Unrelated development data will be left untouched.'
      )
    ) {
      return
    }

    onAction(action)
  }

  return (
    <section className={styles.lifecycle} aria-label="Scenario lifecycle">
      <div>
        <strong>Scenario lifecycle</strong>
        <span>Reset is deterministic. Cleanup only removes owned fixtures.</span>
      </div>
      <div className={styles.lifecycleButtons}>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => performLifecycleAction('reset')}
        >
          {hasFixture ? 'Reset fixture' : 'Create fixture'}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => performLifecycleAction('run-all')}
        >
          Run all checks
        </button>
        <button
          className={styles.cleanupButton}
          type="button"
          disabled={isBusy || !hasFixture}
          onClick={() => performLifecycleAction('cleanup')}
        >
          Cleanup scenario data
        </button>
      </div>
    </section>
  )
}

function snapshot(value: unknown) {
  return value === undefined ? 'Not captured' : JSON.stringify(value, null, 2)
}

export function ScenarioResultPanels<TState>({
  result,
}: {
  result: DevScenarioResponse<TState> | null
}) {
  const checks = result?.checks ?? []
  const passed = checks.filter((check) => check.status === 'passed').length

  return (
    <div className={styles.results}>
      <section
        className={`${styles.notice} ${result?.ok === false ? styles.noticeError : ''}`}
        aria-live="polite"
        aria-atomic="true"
      >
        <strong>{result?.error?.code ?? 'Scenario status'}</strong>
        <p>{result?.message ?? 'Loading persisted scenario state…'}</p>
      </section>

      {result?.activity && (
        <section className={styles.activity} aria-labelledby="last-observation">
          <div className={styles.sectionHeading}>
            <div>
              <span>Latest observation</span>
              <h2 id="last-observation">{result.activity.action}</h2>
            </div>
            <span className={styles[result.activity.status]}>
              {result.activity.status}
            </span>
          </div>
          <dl className={styles.observationGrid}>
            <div>
              <dt>Acting user</dt>
              <dd>{result.activity.actor}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>{result.activity.target}</dd>
            </div>
            <div>
              <dt>Expected</dt>
              <dd>{result.activity.expected}</dd>
            </div>
            <div>
              <dt>Actual</dt>
              <dd>{result.activity.actual}</dd>
            </div>
          </dl>
          {result.activity.domainErrorCode && (
            <p className={styles.domainCode}>
              Domain error: <code>{result.activity.domainErrorCode}</code>
            </p>
          )}
        </section>
      )}

      {result?.cleanup && (
        <section className={styles.cleanupReport} aria-labelledby="cleanup-report">
          <div className={styles.sectionHeading}>
            <div>
              <span>Owned-record cleanup</span>
              <h2 id="cleanup-report">Cleanup report</h2>
            </div>
          </div>
          <div className={styles.cleanupColumns}>
            <div>
              <strong>Deleted</strong>
              {result.cleanup.deleted.length ? (
                <ul>
                  {result.cleanup.deleted.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              ) : (
                <p>No disposable records existed.</p>
              )}
            </div>
            <div>
              <strong>Intentionally retained</strong>
              {result.cleanup.retained.length ? (
                <ul>
                  {result.cleanup.retained.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              ) : (
                <p>Nothing retained.</p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className={styles.acceptance} aria-labelledby="acceptance-report">
        <div className={styles.sectionHeading}>
          <div>
            <span>Executable acceptance criteria</span>
            <h2 id="acceptance-report">Acceptance report</h2>
          </div>
          {checks.length > 0 && (
            <strong>
              {passed}/{checks.length} passed
            </strong>
          )}
        </div>
        {checks.length ? (
          <div className={styles.checkGrid}>
            {checks.map((check) => (
              <article className={styles.check} key={check.id}>
                <span className={styles[check.status]}>{check.status}</span>
                <h3>{check.title}</h3>
                <p>{check.detail}</p>
                <dl>
                  {check.actor && (
                    <div>
                      <dt>Actor</dt>
                      <dd>{check.actor}</dd>
                    </div>
                  )}
                  {check.target && (
                    <div>
                      <dt>Target</dt>
                      <dd>{check.target}</dd>
                    </div>
                  )}
                  {check.expected && (
                    <div>
                      <dt>Expected</dt>
                      <dd>{check.expected}</dd>
                    </div>
                  )}
                  {check.actual && (
                    <div>
                      <dt>Actual</dt>
                      <dd>{check.actual}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Run all checks to populate this report.</p>
        )}
      </section>

      {result && result.before !== undefined && (
        <details className={styles.snapshots}>
          <summary>Inspect persisted before/after state</summary>
          <div>
            <section>
              <h3>Before</h3>
              <pre>{snapshot(result.before)}</pre>
            </section>
            <section>
              <h3>After</h3>
              <pre>{snapshot(result.state)}</pre>
            </section>
          </div>
        </details>
      )}
    </div>
  )
}
