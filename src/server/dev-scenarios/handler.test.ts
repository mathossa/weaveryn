import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DevScenario } from './contracts'

const scenario = vi.hoisted(() => ({
  metadata: {
    id: 'registered-scenario',
    title: 'Registered scenario',
    domain: 'Tests',
    purpose: 'Test handler plumbing',
    href: '/dev/registered-scenario',
    issueNumbers: [34],
    prerequisites: [],
    availability: 'available',
    fixtureNamespace: 'dev:registered-scenario:v1',
  },
  readState: vi.fn(),
  reset: vi.fn(),
  cleanup: vi.fn(),
  runAll: vi.fn(),
  isAction: vi.fn(),
  execute: vi.fn(),
  mapError: vi.fn(),
}))

vi.mock('./registry', () => ({
  getDevScenario: (id: string) =>
    id === scenario.metadata.id ? (scenario as unknown as DevScenario) : undefined,
}))

import {
  handleDevScenarioGet,
  handleDevScenarioPost,
  parseLifecycleAction,
} from './handler'

const safeEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'development',
  DEV_DATABASE_NAME: 'weaveryn_dev',
  DATABASE_URL: 'postgresql://user:secret@localhost:5432/weaveryn_dev',
}

describe('shared development scenario handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scenario.readState.mockResolvedValue({ fixture: true })
    scenario.isAction.mockReturnValue(false)
  })

  it('recognizes only exact shared lifecycle requests', () => {
    expect(parseLifecycleAction({ action: 'reset' })).toBe('reset')
    expect(parseLifecycleAction({ action: 'cleanup' })).toBe('cleanup')
    expect(parseLifecycleAction({ action: 'run-all' })).toBe('run-all')
    expect(parseLifecycleAction({ action: 'reset', recordId: 'arbitrary' })).toBeNull()
    expect(parseLifecycleAction({ action: 'truncate' })).toBeNull()
  })

  it('returns 404 in production before any scenario state is read', async () => {
    const response = await handleDevScenarioGet('registered-scenario', {
      NODE_ENV: 'production',
    })

    expect(response.status).toBe(404)
    expect(scenario.readState).not.toHaveBeenCalled()
  })

  it('returns 404 for an unregistered scenario', async () => {
    const response = await handleDevScenarioGet(
      'not-registered',
      safeEnvironment
    )

    expect(response.status).toBe(404)
  })

  it('rejects unknown actions and arbitrary record IDs server-side', async () => {
    const request = new Request('http://localhost/api/dev/scenarios/registered-scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset', recordId: 'arbitrary' }),
    })
    const response = await handleDevScenarioPost(
      request,
      'registered-scenario',
      safeEnvironment
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('INVALID_SCENARIO_ACTION')
    expect(scenario.reset).not.toHaveBeenCalled()
    expect(scenario.execute).not.toHaveBeenCalled()
  })
})
