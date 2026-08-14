'use client'

import { useEffect, useState } from 'react'
import type {
  FormerOwnerState,
  LabResponse,
  LabUserKey,
  LabWorldState,
} from './types'
import styles from './ownership-transfer-lab.module.css'

type LabAction =
  | { action: 'reset' }
  | { action: 'run-all' }
  | {
      action: 'transfer'
      actor: 'A' | 'C'
      formerOwnerState: FormerOwnerState
    }

const people: Array<{
  key: LabUserKey
  name: string
  purpose: string
}> = [
  { key: 'A', name: 'Aria', purpose: 'Original owner' },
  { key: 'B', name: 'Bram', purpose: 'Transfer target' },
  { key: 'C', name: 'Cora', purpose: 'Non-owner test' },
]

const formerOwnerOptions: Array<{
  value: FormerOwnerState
  label: string
}> = [
  { value: 'ADMIN', label: 'Stay as ADMIN' },
  { value: 'MEMBER', label: 'Stay as MEMBER' },
  { value: 'VIEWER', label: 'Stay as VIEWER' },
  { value: 'LEAVE', label: 'Leave the World' },
]

function relationshipFor(state: LabWorldState | null, userKey: LabUserKey) {
  if (state?.owner?.key === userKey) {
    return 'OWNER'
  }

  return (
    state?.memberships.find((membership) => membership.user.key === userKey)
      ?.role ?? 'NO MEMBERSHIP'
  )
}

export function OwnershipTransferLab() {
  const [result, setResult] = useState<LabResponse | null>(null)
  const [actor, setActor] = useState<'A' | 'C'>('A')
  const [formerOwnerState, setFormerOwnerState] =
    useState<FormerOwnerState>('MEMBER')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadState() {
      try {
        const response = await fetch('/api/dev/world-ownership-transfer', {
          signal: controller.signal,
        })
        const data = (await response.json()) as LabResponse
        setResult(data)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        setResult({
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : 'Could not load the development World.',
          state: null,
          error: { code: 'NETWORK_ERROR' },
        })
      }
    }

    void loadState()
    return () => controller.abort()
  }, [])

  async function perform(action: LabAction) {
    setIsBusy(true)

    try {
      const response = await fetch('/api/dev/world-ownership-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      })
      const data = (await response.json()) as LabResponse
      setResult(data)
    } catch (error) {
      setResult((current) => ({
        ok: false,
        message:
          error instanceof Error ? error.message : 'The lab request failed.',
        state: current?.state ?? null,
        error: { code: 'NETWORK_ERROR' },
      }))
    } finally {
      setIsBusy(false)
    }
  }

  const world = result?.state ?? null
  const checks = result?.checks ?? []
  const passedChecks = checks.filter((check) => check.passed).length

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>
              <span className={styles.devDot} />
              Development only · Issue #12
            </div>
            <h1>World ownership transfer lab</h1>
            <p className={styles.intro}>
              Create a real database World owned by A, transfer it to B through
              the production service, and inspect every ownership and membership
              change.
            </p>
          </div>
          <button
            className={styles.secondaryButton}
            type="button"
            disabled={isBusy}
            onClick={() => void perform({ action: 'run-all' })}
          >
            {isBusy ? 'Working…' : 'Run all acceptance checks'}
          </button>
        </header>

        <section className={styles.flow} aria-label="Test flow">
          <div className={styles.flowStep}>
            <span>1</span>
            Create World owned by A
          </div>
          <div className={styles.flowArrow}>→</div>
          <div className={styles.flowStep}>
            <span>2</span>
            Transfer to B
          </div>
          <div className={styles.flowArrow}>→</div>
          <div className={styles.flowStep}>
            <span>3</span>
            Verify invariants
          </div>
        </section>

        <div className={styles.workspace}>
          <section className={styles.worldPanel} aria-labelledby="world-state">
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.sectionLabel}>Live database state</span>
                <h2 id="world-state">{world?.name ?? 'No lab World yet'}</h2>
              </div>
              <span
                className={
                  world?.owner ? styles.ownerPresent : styles.ownerMissing
                }
              >
                {world?.owner ? 'Owner assigned' : 'No owner'}
              </span>
            </div>

            <div className={styles.peopleGrid}>
              {people.map((person) => {
                const relationship = relationshipFor(world, person.key)
                const isOwner = relationship === 'OWNER'

                return (
                  <article
                    className={`${styles.personCard} ${isOwner ? styles.ownerCard : ''}`}
                    key={person.key}
                  >
                    <div className={styles.avatar}>{person.key}</div>
                    <div className={styles.personCopy}>
                      <strong>{person.name}</strong>
                      <span>{person.purpose}</span>
                    </div>
                    <span
                      className={`${styles.roleBadge} ${isOwner ? styles.ownerBadge : ''}`}
                    >
                      {relationship}
                    </span>
                  </article>
                )
              })}
            </div>

            {world ? (
              <div className={styles.worldId}>
                <span>World ID</span>
                <code>{world.id}</code>
              </div>
            ) : (
              <div className={styles.emptyState}>
                Start by creating the deterministic test scenario. B begins as
                a MEMBER so you can see that membership disappear when B becomes
                owner.
              </div>
            )}

            <button
              className={styles.primaryButton}
              type="button"
              disabled={isBusy}
              onClick={() => void perform({ action: 'reset' })}
            >
              {world ? 'Reset: A owns the World' : 'Create World owned by A'}
            </button>
          </section>

          <section className={styles.transferPanel} aria-labelledby="transfer">
            <span className={styles.sectionLabel}>Manual scenario</span>
            <h2 id="transfer">Transfer ownership to B</h2>
            <p className={styles.panelDescription}>
              Pick who initiates the transfer and what happens to A afterward.
              Choosing C verifies the authorization failure.
            </p>

            <div className={styles.field}>
              <label htmlFor="actor">Acting user</label>
              <select
                id="actor"
                value={actor}
                disabled={isBusy}
                onChange={(event) =>
                  setActor(event.target.value as 'A' | 'C')
                }
              >
                <option value="A">A · Current owner</option>
                <option value="C">C · Non-owner (should fail)</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="former-owner-state">A after transfer</label>
              <select
                id="former-owner-state"
                value={formerOwnerState}
                disabled={isBusy}
                onChange={(event) =>
                  setFormerOwnerState(event.target.value as FormerOwnerState)
                }
              >
                {formerOwnerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.transferSummary}>
              <span className={styles.summaryActor}>{actor}</span>
              <span>initiates</span>
              <span className={styles.summaryArrow}>→</span>
              <span className={styles.summaryActor}>B</span>
              <span>becomes owner</span>
            </div>

            <button
              className={styles.transferButton}
              type="button"
              disabled={isBusy || !world}
              onClick={() =>
                void perform({
                  action: 'transfer',
                  actor,
                  formerOwnerState,
                })
              }
            >
              {isBusy ? 'Transferring…' : 'Transfer ownership'}
            </button>
          </section>
        </div>

        <section
          className={`${styles.notice} ${result?.ok === false ? styles.noticeError : ''}`}
          aria-live="polite"
        >
          <div className={styles.noticeIcon}>
            {result?.ok === false ? '!' : 'i'}
          </div>
          <div>
            <strong>{result?.error?.code ?? 'Lab status'}</strong>
            <p>{result?.message ?? 'Loading the development World…'}</p>
          </div>
        </section>

        <section className={styles.acceptance} aria-labelledby="acceptance">
          <div className={styles.acceptanceHeading}>
            <div>
              <span className={styles.sectionLabel}>Issue acceptance criteria</span>
              <h2 id="acceptance">Live acceptance report</h2>
            </div>
            {checks.length > 0 && (
              <span className={styles.score}>
                {passedChecks}/{checks.length} passed
              </span>
            )}
          </div>

          {checks.length > 0 ? (
            <div className={styles.checkGrid}>
              {checks.map((check) => (
                <article className={styles.checkCard} key={check.id}>
                  <span
                    className={
                      check.passed ? styles.checkPassed : styles.checkFailed
                    }
                  >
                    {check.passed ? '✓' : '×'}
                  </span>
                  <div>
                    <strong>{check.title}</strong>
                    <p>{check.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.acceptanceEmpty}>
              Run all acceptance checks to execute non-owner rejection, every
              former-owner state, new-owner membership removal, non-orphaning,
              and a forced rollback against your development database.
            </div>
          )}

          <div className={styles.terminalCheck}>
            <div>
              <strong>Complete the automated test criterion</strong>
              <p>
                The live report exercises the database. Confirm the full unit,
                lint, and production build suites in a second terminal.
              </p>
            </div>
            <code>npm test &amp;&amp; npm run lint &amp;&amp; npm run build</code>
          </div>
        </section>

        <footer className={styles.footer}>
          Reset only replaces the fixed issue #12 lab World. Other Worlds are
          untouched; the three lab users are retained for repeatable testing.
        </footer>
      </div>
    </main>
  )
}

