import { NextResponse } from 'next/server'
import type {
  DevLifecycleAction,
  DevScenario,
  DevScenarioActionResult,
  DevScenarioResponse,
} from '@/dev/scenario-contracts'
import { assertSafeDevEnvironment, DevEnvironmentError } from './environment'
import { getDevScenario } from './registry'

export function isProductionEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return environment.NODE_ENV === 'production'
}

export function parseLifecycleAction(
  value: unknown,
): DevLifecycleAction | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const request = value as Record<string, unknown>
  if (Object.keys(request).length !== 1) {
    return null
  }

  if (
    request.action === 'reset' ||
    request.action === 'run-all' ||
    request.action === 'cleanup'
  ) {
    return request.action
  }

  return null
}

function unavailableResponse() {
  return new NextResponse(null, { status: 404 })
}

function response<TState>(
  scenarioId: string,
  body: Omit<DevScenarioResponse<TState>, 'scenarioId'>,
  status = 200,
) {
  return NextResponse.json<DevScenarioResponse<TState>>(
    { scenarioId, ...body },
    { status },
  )
}

async function safelyReadState(scenario: DevScenario) {
  try {
    return await scenario.readState()
  } catch {
    return null
  }
}

function environmentErrorResponse(
  scenarioId: string,
  error: DevEnvironmentError,
) {
  return response(
    scenarioId,
    {
      ok: false,
      message: error.message,
      state: null,
      error: { code: error.code },
    },
    503,
  )
}

function resultResponse(
  scenarioId: string,
  result: DevScenarioActionResult,
  before: unknown,
  state: unknown,
) {
  return response(scenarioId, {
    ok: result.ok,
    message: result.message,
    before,
    state,
    checks: result.checks,
    activity: result.activity,
    cleanup: result.cleanup,
  })
}

async function executeLifecycleAction(
  scenario: DevScenario,
  action: DevLifecycleAction,
) {
  if (action === 'reset') {
    return scenario.reset()
  }

  if (action === 'run-all') {
    return scenario.runAll()
  }

  return scenario.cleanup()
}

export async function handleDevScenarioGet(
  scenarioId: string,
  environment: NodeJS.ProcessEnv = process.env,
) {
  if (isProductionEnvironment(environment)) {
    return unavailableResponse()
  }

  const scenario = getDevScenario(scenarioId)
  if (!scenario) {
    return unavailableResponse()
  }

  try {
    assertSafeDevEnvironment(environment)
    const state = await scenario.readState()
    return response(scenarioId, {
      ok: true,
      message: state
        ? 'Loaded the current persisted scenario state.'
        : 'Create or reset the scenario fixture to begin.',
      state,
    })
  } catch (error) {
    if (error instanceof DevEnvironmentError) {
      return environmentErrorResponse(scenarioId, error)
    }

    const mapped = scenario.mapError?.(error)
    if (mapped) {
      return response(
        scenarioId,
        {
          ok: false,
          message: mapped.message,
          state: null,
          activity: mapped.activity,
          error: { code: mapped.code },
        },
        mapped.status,
      )
    }

    return response(
      scenarioId,
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Could not inspect the development scenario.',
        state: null,
        error: { code: 'SCENARIO_INFRASTRUCTURE_ERROR' },
      },
      500,
    )
  }
}

export async function handleDevScenarioPost(
  request: Request,
  scenarioId: string,
  environment: NodeJS.ProcessEnv = process.env,
) {
  if (isProductionEnvironment(environment)) {
    return unavailableResponse()
  }

  const scenario = getDevScenario(scenarioId)
  if (!scenario) {
    return unavailableResponse()
  }

  try {
    assertSafeDevEnvironment(environment)
  } catch (error) {
    if (error instanceof DevEnvironmentError) {
      return environmentErrorResponse(scenarioId, error)
    }
    throw error
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return response(
      scenarioId,
      {
        ok: false,
        message: 'Request body must be valid JSON.',
        state: await safelyReadState(scenario),
        error: { code: 'INVALID_SCENARIO_REQUEST' },
      },
      400,
    )
  }

  const lifecycleAction = parseLifecycleAction(body)
  if (!lifecycleAction && !scenario.isAction(body)) {
    return response(
      scenarioId,
      {
        ok: false,
        message: 'The scenario action or its parameters are not registered.',
        state: await safelyReadState(scenario),
        error: { code: 'INVALID_SCENARIO_ACTION' },
      },
      400,
    )
  }

  const before = await safelyReadState(scenario)

  try {
    const result = lifecycleAction
      ? await executeLifecycleAction(scenario, lifecycleAction)
      : await scenario.execute(body)
    const state = await scenario.readState()
    return resultResponse(scenarioId, result, before, state)
  } catch (error) {
    const mapped = scenario.mapError?.(error, body)
    const state = await safelyReadState(scenario)

    if (mapped) {
      return response(
        scenarioId,
        {
          ok: false,
          message: mapped.message,
          before,
          state,
          activity: mapped.activity,
          error: { code: mapped.code },
        },
        mapped.status,
      )
    }

    return response(
      scenarioId,
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'The scenario infrastructure failed.',
        before,
        state,
        activity: {
          action:
            body && typeof body === 'object'
              ? String((body as Record<string, unknown>).action ?? 'unknown')
              : 'unknown',
          actor: 'Scenario runner',
          target: scenario.metadata.title,
          expected: 'Scenario action completes through registered plumbing',
          actual: 'Infrastructure error',
          status: 'infrastructure-error',
        },
        error: { code: 'SCENARIO_INFRASTRUCTURE_ERROR' },
      },
      500,
    )
  }
}
