'use client'

import { useState } from 'react'
import { requireDevScenarioMetadata } from '@/dev/scenario-catalog'
import type {
  CampaignCreateActor,
  CampaignFoundationAction,
  CampaignFoundationState,
  CampaignLifecycleActor,
  CampaignUpdateActor,
} from '@/dev/scenarios/campaign-foundation'
import {
  ScenarioLifecycleControls,
  ScenarioNavigation,
  ScenarioResultPanels,
} from '../_components/scenario-ui'
import { useDevScenario } from '../_components/use-dev-scenario'
import styles from './campaign-foundation.module.css'

const metadata = requireDevScenarioMetadata('campaign-foundation')
const ownerCampaignId = '15000000-0000-4000-8000-000000000010'
const adminCampaignId = '15000000-0000-4000-8000-000000000011'
const memberCampaignId = '15000000-0000-4000-8000-000000000012'

export function CampaignFoundationLab() {
  const [createActor, setCreateActor] =
    useState<CampaignCreateActor>('WORLD_OWNER')
  const [updateActor, setUpdateActor] =
    useState<CampaignUpdateActor>('CAMPAIGN_OWNER')
  const [lifecycleActor, setLifecycleActor] = useState<CampaignLifecycleActor>(
    'CURRENT_CAMPAIGN_OWNER',
  )
  const { result, isBusy, perform } = useDevScenario<
    CampaignFoundationState,
    CampaignFoundationAction
  >(metadata.id)
  const state = result?.state ?? null
  const selectedCampaignId =
    createActor === 'WORLD_OWNER'
      ? ownerCampaignId
      : createActor === 'WORLD_ADMIN'
        ? adminCampaignId
        : memberCampaignId
  const selectedCampaignExists = state?.campaigns.some(
    (campaign) => campaign.id === selectedCampaignId,
  )
  const adminCampaign = state?.campaigns.find(
    (campaign) => campaign.id === adminCampaignId,
  )

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <ScenarioNavigation issueNumbers={metadata.issueNumbers} />

        <header className={styles.header}>
          <span>Development only · Issue #15</span>
          <h1>Campaign foundation laboratory</h1>
          <p>
            Create a playable Campaign inside a persisted World, confirm that
            World owner, Admin, and Threadwalker permissions authorize creation,
            and observe that the creator—not the World owner—holds Campaign
            authority.
          </p>
        </header>

        <ScenarioLifecycleControls
          isBusy={isBusy}
          hasFixture={Boolean(state)}
          onAction={(action) => void perform({ action })}
        />

        <section className={styles.context} aria-labelledby="fixture-context">
          <div>
            <span>Persisted fixture</span>
            <h2 id="fixture-context">
              {state?.world.name ?? 'No Campaign fixture yet'}
            </h2>
            <p>
              {state
                ? `${state.timeline.name} timeline · ${state.campaigns.length} Campaign${state.campaigns.length === 1 ? '' : 's'}`
                : 'Create the deterministic fixture to enable service actions.'}
            </p>
          </div>
          {state && (
            <dl>
              {state.people.map((person) => (
                <div key={person.id}>
                  <dt>{person.worldRole}</dt>
                  <dd>{person.displayName}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <div className={styles.workspace}>
          <section className={styles.actionCard} aria-labelledby="create-title">
            <span>Real create service</span>
            <h2 id="create-title">Create a Campaign</h2>
            <p>
              Owner, Admin, and World Member (Threadwalker) all create their own
              Campaign. Threadwatchers and Campaign-only users remain
              unauthorized.
            </p>
            <label htmlFor="campaign-create-actor">Acting user</label>
            <select
              id="campaign-create-actor"
              value={createActor}
              disabled={isBusy}
              onChange={(event) =>
                setCreateActor(event.target.value as CampaignCreateActor)
              }
            >
              <option value="WORLD_OWNER">Wren · World owner</option>
              <option value="WORLD_ADMIN">Ada · World Admin</option>
              <option value="WORLD_MEMBER">
                Mira · World Member / Threadwalker
              </option>
            </select>
            <button
              type="button"
              disabled={isBusy || !state || selectedCampaignExists}
              onClick={() =>
                void perform({ action: 'create-campaign', actor: createActor })
              }
            >
              {selectedCampaignExists
                ? 'Campaign already created—reset to retry'
                : isBusy
                  ? 'Working…'
                  : 'Create through CampaignService'}
            </button>
          </section>

          <section className={styles.actionCard} aria-labelledby="update-title">
            <span>Independent authority</span>
            <h2 id="update-title">Update Ada’s Campaign</h2>
            <p>
              Create as Ada first. Ada succeeds as Campaign owner; Wren is
              rejected even though Wren owns the parent World.
            </p>
            <label htmlFor="campaign-update-actor">Acting user</label>
            <select
              id="campaign-update-actor"
              value={updateActor}
              disabled={isBusy}
              onChange={(event) =>
                setUpdateActor(event.target.value as CampaignUpdateActor)
              }
            >
              <option value="CAMPAIGN_OWNER">
                Ada · Campaign owner (should succeed)
              </option>
              <option value="WORLD_OWNER">
                Wren · World owner (should fail)
              </option>
            </select>
            <button
              type="button"
              disabled={isBusy || !adminCampaign}
              onClick={() =>
                void perform({
                  action: 'update-admin-campaign',
                  actor: updateActor,
                })
              }
            >
              {isBusy ? 'Working…' : 'Advance name, position, and date'}
            </button>
          </section>

          <section
            className={`${styles.actionCard} ${styles.lifecycleCard}`}
            aria-labelledby="lifecycle-title"
          >
            <span>Owner-only lifecycle</span>
            <h2 id="lifecycle-title">Transfer, end, archive, or delete</h2>
            <p>
              Create Ada’s Campaign first. Use the current Campaign owner to
              advance the workflow, or choose Wren to verify that owning the
              parent World grants no Campaign lifecycle authority.
            </p>
            <label htmlFor="campaign-lifecycle-actor">Acting user</label>
            <select
              id="campaign-lifecycle-actor"
              value={lifecycleActor}
              disabled={isBusy}
              onChange={(event) =>
                setLifecycleActor(event.target.value as CampaignLifecycleActor)
              }
            >
              <option value="CURRENT_CAMPAIGN_OWNER">
                Current Campaign owner (should succeed)
              </option>
              <option value="WORLD_OWNER">
                Wren · World owner only (should fail)
              </option>
            </select>
            <div className={styles.lifecycleActions}>
              <button
                type="button"
                disabled={
                  isBusy ||
                  !adminCampaign ||
                  adminCampaign.status === 'ARCHIVED'
                }
                onClick={() =>
                  void perform({
                    action: 'transfer-admin-campaign',
                    actor: lifecycleActor,
                  })
                }
              >
                Transfer to alternate fixture member
              </button>
              <button
                type="button"
                disabled={
                  isBusy || !adminCampaign || adminCampaign.status !== 'ACTIVE'
                }
                onClick={() =>
                  void perform({
                    action: 'end-admin-campaign',
                    actor: lifecycleActor,
                  })
                }
              >
                End Campaign
              </button>
              <button
                type="button"
                disabled={
                  isBusy || !adminCampaign || adminCampaign.status !== 'ENDED'
                }
                onClick={() =>
                  void perform({
                    action: 'archive-admin-campaign',
                    actor: lifecycleActor,
                  })
                }
              >
                Archive Campaign
              </button>
              <button
                type="button"
                disabled={isBusy || !adminCampaign}
                onClick={() =>
                  void perform({
                    action: 'delete-admin-campaign',
                    actor: lifecycleActor,
                  })
                }
              >
                Delete Campaign
              </button>
            </div>
          </section>
        </div>

        <section className={styles.campaigns} aria-labelledby="campaign-rows">
          <div className={styles.sectionHeading}>
            <div>
              <span>Database observation</span>
              <h2 id="campaign-rows">Persisted Campaigns</h2>
            </div>
            <strong>{state?.campaigns.length ?? 0} rows</strong>
          </div>
          {state?.campaigns.length ? (
            <div className={styles.campaignGrid}>
              {state.campaigns.map((campaign) => (
                <article key={campaign.id}>
                  <div>
                    <span>{campaign.status}</span>
                    <h3>{campaign.name}</h3>
                  </div>
                  <dl>
                    <div>
                      <dt>Campaign owner</dt>
                      <dd>{campaign.ownerId}</dd>
                    </div>
                    <div>
                      <dt>World / timeline</dt>
                      <dd>
                        {campaign.worldId} / {campaign.timelineId}
                      </dd>
                    </div>
                    <div>
                      <dt>Current position</dt>
                      <dd>
                        {campaign.currentWorldPosition} ·{' '}
                        {campaign.currentWorldDateLabel}
                      </dd>
                    </div>
                    <div>
                      <dt>Living World context</dt>
                      <dd>
                        {campaign.currentLocationId ?? 'No Current Location'} ·{' '}
                        {campaign.currentFocus ?? 'No current focus'}
                      </dd>
                    </div>
                    <div>
                      <dt>Campaign memberships</dt>
                      <dd>
                        {campaign.memberships
                          .map(
                            (membership) =>
                              `${membership.userId}: ${membership.role}`,
                          )
                          .join(' · ')}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>
              No Campaign rows. Use the create action or run all checks.
            </p>
          )}
        </section>

        <ScenarioResultPanels result={result} />
      </div>
    </main>
  )
}
