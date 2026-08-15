'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DevScenarioResponse } from '@/server/dev-scenarios/contracts'

export function useDevScenario<TState>(scenarioId: string) {
  const [result, setResult] = useState<DevScenarioResponse<TState> | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const endpoint = `/api/dev/scenarios/${scenarioId}`

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(endpoint, { signal })
        if (response.status === 404) {
          throw new Error('This development scenario is unavailable.')
        }
        const data = (await response.json()) as DevScenarioResponse<TState>
        setResult(data)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        setResult({
          ok: false,
          scenarioId,
          message:
            error instanceof Error
              ? error.message
              : 'Could not load the development scenario.',
          state: null,
          error: { code: 'NETWORK_ERROR' },
        })
      }
    },
    [endpoint, scenarioId]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const perform = useCallback(
    async (action: Record<string, unknown>) => {
      setIsBusy(true)

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        })
        if (response.status === 404) {
          throw new Error('This development scenario is unavailable.')
        }
        const data = (await response.json()) as DevScenarioResponse<TState>
        setResult(data)
      } catch (error) {
        setResult((current) => ({
          ok: false,
          scenarioId,
          message:
            error instanceof Error ? error.message : 'The scenario request failed.',
          state: current?.state ?? null,
          error: { code: 'NETWORK_ERROR' },
        }))
      } finally {
        setIsBusy(false)
      }
    },
    [endpoint, scenarioId]
  )

  return { result, isBusy, perform, reload: load }
}
