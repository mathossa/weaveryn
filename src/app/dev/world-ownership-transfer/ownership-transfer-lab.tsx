'use client'

import { useState } from 'react'
import { getDevScenarioMetadata } from '@/dev/scenario-catalog'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'
import type {
  FormerOwnerState,
  LabUserKey,
  LabWorldState,
} from './types'
import styles from './ownership-transfer-lab.module.css'

const metadata = getDevScenarioMetadata('world-ownership-transfer')!

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
  const [actor, setActor] = useState<'A' | 'C'>('A')
  const [formerOwnerState, setFormerOwnerState] =
    useState<FormerOwnerState>('MEMBER')
  const { result, isBusy, perform } = useDevScenario<LabWorldState>(metadata.id)
  const world = result?.state ?? null

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <ScenarioNavigation issueNumbers={[...metadata.issueNumbers]} />

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
        </header>

        <ScenarioLifecycleControls
          isBusy={isBusy}
          hasFixture={Boolean(world)}
          onAction={(action) => void perform({ action })}
        />

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
                Create the deterministic scenario fixture. B begins as a MEMBER
                so the transfer visibly removes B&apos;s membership.
              </div>
            )}
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

        <ScenarioResultPanels result={result} />

        <footer className={styles.footer}>
          Reset only replaces the namespaced issue #12 fixture. Cleanup removes
          its disposable World and users unless external references require a
          fixture user to be retained and reported.
        </footer>
      </div>
    </main>
  )
}
