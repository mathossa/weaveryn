'use client'

import type { VisibilityScope } from '@/server/world-entities'
import styles from '../entity.module.css'
import visibilityStyles from './visibility-fields.module.css'

export interface VisibilityValue {
  scope: VisibilityScope
  campaignId: string
  userId: string
}

export function VisibilityFields({
  value,
  onChange,
  campaigns,
  users,
  compact = false,
}: {
  value: VisibilityValue
  onChange: (value: VisibilityValue) => void
  campaigns: { id: string; name: string }[]
  users: { id: string; label: string }[]
  compact?: boolean
}) {
  function change(patch: Partial<VisibilityValue>) {
    onChange({ ...value, ...patch })
  }

  return (
    <div
      className={`${styles.visibilityFields} ${compact ? visibilityStyles.compact : ''}`}
    >
      <label className={styles.field}>
        <span>Visibility</span>
        <select
          value={value.scope}
          onChange={(event) => {
            const scope = event.target.value as VisibilityScope
            change({
              scope,
              campaignId:
                scope === 'CAMPAIGN' || scope === 'GM' || scope === 'PLAYER'
                  ? value.campaignId
                  : '',
              userId: scope === 'PLAYER' ? value.userId : '',
            })
          }}
        >
          <option value="WORLD">World members</option>
          <option value="CAMPAIGN">Campaign members</option>
          <option value="GM">Campaign GM / Assistant GM</option>
          <option value="PLAYER">Specific player</option>
          <option value="PRIVATE">Only me</option>
        </select>
      </label>

      {value.scope === 'CAMPAIGN' || value.scope === 'GM' ? (
        <label className={styles.field}>
          <span>Campaign</span>
          <select
            required
            value={value.campaignId}
            onChange={(event) => change({ campaignId: event.target.value })}
          >
            <option value="">Choose Campaign</option>
            {campaigns.map((campaign) => (
              <option value={campaign.id} key={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {value.scope === 'PLAYER' ? (
        <>
          <label className={styles.field}>
            <span>Player</span>
            <select
              required
              value={value.userId}
              onChange={(event) => change({ userId: event.target.value })}
            >
              <option value="">Choose player</option>
              {users.map((user) => (
                <option value={user.id} key={user.id}>
                  {user.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Limit to Campaign (optional)</span>
            <select
              value={value.campaignId}
              onChange={(event) => change({ campaignId: event.target.value })}
            >
              <option value="">No Campaign limit</option>
              {campaigns.map((campaign) => (
                <option value={campaign.id} key={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      <p className={styles.helpText}>
        Visibility is enforced by the server. Advanced selected-recipient and
        hide-from-GM audiences are intentionally deferred beyond the MVP.
      </p>
    </div>
  )
}
