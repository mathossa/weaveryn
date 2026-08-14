import type { DevScenario } from './contracts'
import { worldOwnershipTransferScenario } from './world-ownership-transfer'
import { worldUpdateExampleScenario } from './world-update-example'

const scenarios = new Map<string, DevScenario>([
  [worldOwnershipTransferScenario.metadata.id, worldOwnershipTransferScenario],
  [worldUpdateExampleScenario.metadata.id, worldUpdateExampleScenario],
])

export function getDevScenario(id: string) {
  return scenarios.get(id)
}

export function listRegisteredDevScenarios() {
  return [...scenarios.values()]
}
