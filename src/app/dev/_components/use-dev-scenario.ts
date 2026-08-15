'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  DevLifecycleRequest,
  DevScenarioResponse,
} from '@/dev/scenario-contracts'
import {
  performDevScenarioAction,
  requestDevScenario,
} from './dev-scenario-client'

export function useDevScenario<
  TState,
  TAction extends object = Record<string, unknown>,
>(scenarioId: string) {
  const [result, setResult] = useState<DevScenarioResponse<TState> | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const data = await requestDevScenario<TState>(scenarioId, { signal })
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
    [scenarioId],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const perform = useCallback(
    async (action: DevLifecycleRequest | TAction) => {
      setIsBusy(true)

      try {
        const data = await performDevScenarioAction<TState>(scenarioId, action)
        setResult(data)
      } catch (error) {
        setResult((current) => ({
          ok: false,
          scenarioId,
          message:
            error instanceof Error
              ? error.message
              : 'The scenario request failed.',
          state: current?.state ?? null,
          error: { code: 'NETWORK_ERROR' },
        }))
      } finally {
        setIsBusy(false)
      }
    },
    [scenarioId],
  )

  return { result, isBusy, perform, reload: load }
}
