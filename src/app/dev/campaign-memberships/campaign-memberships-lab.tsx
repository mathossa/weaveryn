'use client'

import { useState } from 'react'
import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type { CampaignRole } from '@/server/campaigns'
import type {
  CampaignMembershipScenarioAction,
  CampaignMembershipScenarioActor,
  CampaignMembershipsScenarioState,
} from '@/dev/scenarios/campaign-memberships'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'
import styles from '../campaign-foundation/campaign-foundation.module.css'

const metadata = requireDevScenarioMetadata('campaign-memberships')
const roles: CampaignRole[] = ['GM', 'ASSISTANT_GM', 'PLAYER', 'SPECTATOR']

export function CampaignMembershipsLab() {
  const [newRole, setNewRole] = useState<CampaignRole>('PLAYER')
  const [unauthorizedActor, setUnauthorizedActor] =
    useState<Exclude<CampaignMembershipScenarioActor, 'OWNER'>>('GM')
  const { result, isBusy, perform } = useDevScenario<
    CampaignMembershipsScenarioState,
    CampaignMembershipScenarioAction
  >(metadata.id)
  const state = result?.state ?? null
  const memberships = new Map(
    state?.memberships.map((membership) => [
      membership.userId,
      membership.role,
    ]),
  )

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <ScenarioNavigation issueNumbers={metadata.issueNumbers} />
        <header className={styles.header}>
          <span>Development only · Issue #16</span>
          <h1>Campaign memberships and roles laboratory</h1>
          <p>
            Inspect separate Campaign ownership and membership roles. Only the
            Campaign owner can manage members; the owner must remain a GM.
          </p>
        </header>
        <ScenarioLifecycleControls
          isBusy={isBusy}
          hasFixture={Boolean(state)}
          onAction={(action) => void perform({ action })}
        />

        <section className={styles.context}>
          <div>
            <span>Persisted fixture</span>
            <h2>{state?.campaign.name ?? 'No membership fixture yet'}</h2>
            <p>
              {state
                ? `Campaign owner: ${state.campaign.ownerId}`
                : 'Create the deterministic fixture to enable service actions.'}
            </p>
          </div>
        </section>

        <div className={styles.workspace}>
          <section className={styles.actionCard}>
            <span>Owner-managed addition</span>
            <h2>Add the available user</h2>
            <p>Aria adds Finn using the real membership service.</p>
            <label htmlFor="new-member-role">Campaign role</label>
            <select
              id="new-member-role"
              value={newRole}
              disabled={isBusy}
              onChange={(event) =>
                setNewRole(event.target.value as CampaignRole)
              }
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={
                isBusy ||
                !state ||
                memberships.has('16000000-0000-4000-8000-00000000000f')
              }
              onClick={() => void perform({ action: 'add', role: newRole })}
            >
              Add through CampaignMembershipService
            </button>
          </section>
          <section className={styles.actionCard}>
            <span>Role and removal changes</span>
            <h2>Change or remove</h2>
            <p>
              Aria can promote Dain or remove Eve; the owner GM membership is
              never a removable role.
            </p>
            <button
              type="button"
              disabled={isBusy || !state}
              onClick={() =>
                void perform({ action: 'change-player-to-assistant' })
              }
            >
              Promote Dain to Assistant GM
            </button>
            <button
              type="button"
              disabled={
                isBusy ||
                !state ||
                !memberships.has('16000000-0000-4000-8000-00000000000e')
              }
              onClick={() => void perform({ action: 'remove-spectator' })}
            >
              Remove Eve’s spectator membership
            </button>
          </section>
          <section className={styles.actionCard}>
            <span>Protected domain outcomes</span>
            <h2>Reject unsafe actions</h2>
            <p>
              Try a duplicate member or a registered non-owner actor. The domain
              error and persisted state are shown below.
            </p>
            <button
              type="button"
              disabled={isBusy || !state}
              onClick={() => void perform({ action: 'duplicate-player' })}
            >
              Try duplicate Dain membership
            </button>
            <label htmlFor="unauthorized-actor">Non-owner actor</label>
            <select
              id="unauthorized-actor"
              value={unauthorizedActor}
              disabled={isBusy}
              onChange={(event) =>
                setUnauthorizedActor(
                  event.target.value as Exclude<
                    CampaignMembershipScenarioActor,
                    'OWNER'
                  >,
                )
              }
            >
              <option value="GM">Bram · GM</option>
              <option value="ASSISTANT_GM">Cora · Assistant GM</option>
              <option value="PLAYER">Dain · Player</option>
              <option value="SPECTATOR">Eve · Spectator</option>
            </select>
            <button
              type="button"
              disabled={isBusy || !state}
              onClick={() =>
                void perform({
                  action: 'unauthorized-add',
                  actor: unauthorizedActor,
                })
              }
            >
              Try unauthorized addition
            </button>
          </section>
        </div>

        <section className={styles.campaigns}>
          <div className={styles.sectionHeading}>
            <div>
              <span>Database observation</span>
              <h2>Campaign roles</h2>
            </div>
            <strong>{state?.memberships.length ?? 0} memberships</strong>
          </div>
          {state ? (
            <div className={styles.campaignGrid}>
              {state.people.map((person) => (
                <article key={person.id}>
                  <div>
                    <span>{person.key}</span>
                    <h3>{person.displayName}</h3>
                  </div>
                  <dl>
                    <div>
                      <dt>Campaign membership</dt>
                      <dd>{memberships.get(person.id) ?? 'Not a member'}</dd>
                    </div>
                    <div>
                      <dt>Ownership</dt>
                      <dd>
                        {person.id === state.campaign.ownerId
                          ? 'Campaign.ownerId (authoritative)'
                          : 'Not owner'}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>
              Create the fixture to inspect memberships.
            </p>
          )}
        </section>
        <ScenarioResultPanels result={result} />
      </div>
    </main>
  )
}
