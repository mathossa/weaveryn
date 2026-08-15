import type { DevScenarioMetadata } from './scenario-catalog'

export type DevLifecycleAction = 'reset' | 'run-all' | 'cleanup'

export interface DevLifecycleRequest {
  action: DevLifecycleAction
}

export type DevAcceptanceStatus =
  'passed' | 'failed' | 'pending' | 'manual' | 'infrastructure-error'

export interface DevAcceptanceCheck {
  id: string
  title: string
  status: DevAcceptanceStatus
  detail: string
  actor?: string
  target?: string
  expected?: string
  actual?: string
  domainErrorCode?: string | null
}

export interface DevScenarioActivity {
  action: string
  actor: string
  target: string
  expected: string
  actual: string
  status: DevAcceptanceStatus
  domainErrorCode?: string | null
}

export interface DevCleanupSummary {
  deleted: string[]
  retained: string[]
}

export interface DevScenarioResponse<TState = unknown> {
  ok: boolean
  scenarioId: string
  message: string
  state: TState | null
  before?: TState | null
  checks?: DevAcceptanceCheck[]
  activity?: DevScenarioActivity
  cleanup?: DevCleanupSummary
  error?: {
    code: string
  }
}

export interface DevScenarioActionResult {
  ok: boolean
  message: string
  checks?: DevAcceptanceCheck[]
  activity?: DevScenarioActivity
  cleanup?: DevCleanupSummary
}

export interface DevScenarioMappedError {
  code: string
  message: string
  status: number
  activity?: DevScenarioActivity
}

export interface DevScenario<TState = unknown, TAction = unknown> {
  metadata: DevScenarioMetadata
  readState(): Promise<TState | null>
  reset(): Promise<DevScenarioActionResult>
  cleanup(): Promise<DevScenarioActionResult>
  runAll(): Promise<DevScenarioActionResult>
  isAction(value: unknown): value is TAction
  execute(value: TAction): Promise<DevScenarioActionResult>
  mapError?(error: unknown, action?: unknown): DevScenarioMappedError | null
}
