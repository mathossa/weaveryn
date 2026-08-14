import {
  handleDevScenarioGet,
  handleDevScenarioPost,
} from '@/server/dev-scenarios/handler'

export const runtime = 'nodejs'

interface ScenarioRouteContext {
  params: Promise<{ scenarioId: string }>
}

export async function GET(_request: Request, context: ScenarioRouteContext) {
  const { scenarioId } = await context.params
  return handleDevScenarioGet(scenarioId)
}

export async function POST(request: Request, context: ScenarioRouteContext) {
  const { scenarioId } = await context.params
  return handleDevScenarioPost(request, scenarioId)
}
