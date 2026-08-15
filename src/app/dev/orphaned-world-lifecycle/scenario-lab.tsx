'use client'

import { useState } from 'react'
import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  OrphanedWorldLifecycleAction,
  OrphanedWorldLifecycleScenarioState,
} from '@/dev/scenarios/orphaned-world-lifecycle'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'
import styles from '../campaign-foundation/campaign-foundation.module.css'

const metadata = requireDevScenarioMetadata('orphaned-world-lifecycle')
const claimants = [
  'ADMIN',
  'MEMBER',
  'VIEWER',
  'CAMPAIGN_OWNER',
  'CAMPAIGN_MEMBER',
] as const

export function OrphanedWorldLifecycleLab() {
  const [claimant, setClaimant] = useState<(typeof claimants)[number]>('ADMIN')
  const { result, isBusy, perform } = useDevScenario<
    OrphanedWorldLifecycleScenarioState,
    OrphanedWorldLifecycleAction
  >(metadata.id)
  const state = result?.state ?? null

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <ScenarioNavigation issueNumbers={metadata.issueNumbers} />
        <header className={styles.header}>
          <span>Development only · Issue #13</span>
          <h1>Orphaned World lifecycle laboratory</h1>
          <p>
            Relinquish authoritative ownership, try each fixed claimant, and
            inspect the World, memberships, timeline, and active Campaign link.
          </p>
        </header>
        <ScenarioLifecycleControls
          isBusy={isBusy}
          hasFixture={Boolean(state?.world)}
          onAction={(action) => void perform({ action })}
        />

        <section className={styles.context}>
          <div>
            <span>Persisted fixture</span>
            <h2>{state?.world?.name ?? 'No orphan lifecycle fixture yet'}</h2>
            <p>
              {state?.world
                ? `World owner: ${state.world.ownerId ?? 'none (orphaned)'} · Timeline: ${state.world.timelineId}`
                : 'Create the fixture to enable lifecycle actions.'}
            </p>
          </div>
        </section>

        <div className={styles.workspace}>
          <section className={styles.actionCard}>
            <span>1 · Owner action</span>
            <h2>Relinquish ownership</h2>
            <p>
              The owner becomes null. The same World, timeline, memberships, and
              Campaign link remain.
            </p>
            <button
              type="button"
              disabled={isBusy || !state?.world || state.world.ownerId === null}
              onClick={() => void perform({ action: 'relinquish' })}
            >
              Relinquish through lifecycle service
            </button>
          </section>
          <section className={styles.actionCard}>
            <span>2 · Successor action</span>
            <h2>Claim the orphan</h2>
            <p>
              While any World ADMIN exists, only an ADMIN may claim. With no
              ADMIN, a MEMBER or active Campaign owner may claim. VIEWER and
              ordinary Campaign membership never qualify by themselves.
            </p>
            <label htmlFor="claimant">Fixed fixture claimant</label>
            <select
              id="claimant"
              value={claimant}
              disabled={isBusy}
              onChange={(event) =>
                setClaimant(event.target.value as (typeof claimants)[number])
              }
            >
              {claimants.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isBusy || !state?.world || state.world.ownerId !== null}
              onClick={() => void perform({ action: 'claim', actor: claimant })}
            >
              Try orphan claim
            </button>
          </section>
          <section className={styles.actionCard}>
            <span>3 · Guarded cleanup</span>
            <h2>Attempt lifecycle cleanup</h2>
            <p>
              Cleanup rejects active Campaigns and eligible successors. Run all
              checks also demonstrates the safe no-successor case.
            </p>
            <button
              type="button"
              disabled={isBusy || !state?.world || state.world.ownerId !== null}
              onClick={() => void perform({ action: 'cleanup' })}
            >
              Attempt cleanup
            </button>
          </section>
        </div>

        <section className={styles.campaigns}>
          <div className={styles.sectionHeading}>
            <div>
              <span>Database observation</span>
              <h2>References that must survive</h2>
            </div>
            <strong>{state?.campaigns.length ?? 0} Campaigns</strong>
          </div>
          {state?.world ? (
            <div className={styles.campaignGrid}>
              <article>
                <div>
                  <span>World</span>
                  <h3>{state.world.id}</h3>
                </div>
                <dl>
                  <div>
                    <dt>Owner</dt>
                    <dd>{state.world.ownerId ?? 'none'}</dd>
                  </div>
                  <div>
                    <dt>Memberships</dt>
                    <dd>
                      {state.worldMemberships
                        .map((membership) => `${membership.role}`)
                        .join(', ') || 'none'}
                    </dd>
                  </div>
                </dl>
              </article>
              {state.campaigns.map((campaign) => (
                <article key={campaign.id}>
                  <div>
                    <span>{campaign.status}</span>
                    <h3>{campaign.id}</h3>
                  </div>
                  <dl>
                    <div>
                      <dt>World link</dt>
                      <dd>{campaign.worldId ?? 'detached'}</dd>
                    </div>
                    <div>
                      <dt>Campaign owner</dt>
                      <dd>{campaign.ownerId}</dd>
                    </div>
                    <div>
                      <dt>Campaign members</dt>
                      <dd>
                        {campaign.memberships
                          .map((membership) => membership.role)
                          .join(', ')}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>
              Create the fixture to inspect persisted references.
            </p>
          )}
        </section>
        <ScenarioResultPanels result={result} />
      </div>
    </main>
  )
}
