import type { DevScenarioResponse } from '@/dev/scenario-contracts'

function scenarioEndpoint(scenarioId: string) {
  return `/api/dev/scenarios/${scenarioId}`
}

export async function requestDevScenario<TState>(
  scenarioId: string,
  init?: RequestInit,
) {
  const response = await fetch(scenarioEndpoint(scenarioId), init)

  if (response.status === 404) {
    throw new Error('This development scenario is unavailable.')
  }

  try {
    return (await response.json()) as DevScenarioResponse<TState>
  } catch {
    throw new Error('The development scenario returned an invalid response.')
  }
}

export function performDevScenarioAction<TState>(
  scenarioId: string,
  action: object,
) {
  return requestDevScenario<TState>(scenarioId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  })
}
