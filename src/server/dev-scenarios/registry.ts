import type { DevScenario } from '@/dev/scenario-contracts'
import { campaignFoundationScenario } from './campaign-foundation'
import { characterWorldCharacterFoundationScenario } from './character-world-character-foundation'
import { worldOwnershipTransferScenario } from './world-ownership-transfer'
import { worldUpdateExampleScenario } from './world-update-example'

const scenarios = new Map<string, DevScenario>([
  [
    characterWorldCharacterFoundationScenario.metadata.id,
    characterWorldCharacterFoundationScenario,
  ],
  [campaignFoundationScenario.metadata.id, campaignFoundationScenario],
  [worldOwnershipTransferScenario.metadata.id, worldOwnershipTransferScenario],
  [worldUpdateExampleScenario.metadata.id, worldUpdateExampleScenario],
])

export function getDevScenario(id: string) {
  return scenarios.get(id)
}

export function listRegisteredDevScenarios() {
  return [...scenarios.values()]
}
