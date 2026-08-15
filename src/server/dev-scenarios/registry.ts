import type { DevScenario } from '@/dev/scenario-contracts'
import { campaignFoundationScenario } from './campaign-foundation'
import { campaignMembershipsScenario } from './campaign-memberships'
import { worldOwnershipTransferScenario } from './world-ownership-transfer'
import { worldUpdateExampleScenario } from './world-update-example'

const scenarios = new Map<string, DevScenario>([
  [campaignFoundationScenario.metadata.id, campaignFoundationScenario],
  [campaignMembershipsScenario.metadata.id, campaignMembershipsScenario],
  [worldOwnershipTransferScenario.metadata.id, worldOwnershipTransferScenario],
  [worldUpdateExampleScenario.metadata.id, worldUpdateExampleScenario],
])

export function getDevScenario(id: string) {
  return scenarios.get(id)
}

export function listRegisteredDevScenarios() {
  return [...scenarios.values()]
}
