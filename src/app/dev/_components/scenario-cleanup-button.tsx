'use client'

import { useState } from 'react'
import type { DevScenarioResponse } from '@/server/dev-scenarios/contracts'
import styles from '../dev-hub.module.css'

export function ScenarioCleanupButton({
  scenarioId,
  scenarioTitle,
}: {
  scenarioId: string
  scenarioTitle: string
}) {
  const [status, setStatus] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function cleanup() {
    if (
      !window.confirm(
        `Clean the namespaced fixture data for “${scenarioTitle}”? Unrelated development data will be left untouched.`
      )
    ) {
      return
    }

    setIsBusy(true)
    setStatus(null)

    try {
      const response = await fetch(`/api/dev/scenarios/${scenarioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' }),
      })
      const result = (await response.json()) as DevScenarioResponse
      setStatus(result.message)
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Scenario cleanup failed.'
      )
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className={styles.cleanupAction}>
      <button type="button" disabled={isBusy} onClick={() => void cleanup()}>
        {isBusy ? 'Cleaning…' : 'Cleanup data'}
      </button>
      {status && (
        <span className={styles.cleanupStatus} role="status">
          {status}
        </span>
      )}
    </div>
  )
}
