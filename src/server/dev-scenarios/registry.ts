import type { DevScenario } from '@/dev/scenario-contracts'
import { campaignCharactersScenario } from './campaign-characters'
import { campaignFoundationScenario } from './campaign-foundation'
import { campaignMembershipsScenario } from './campaign-memberships'
import { characterWorldCharacterFoundationScenario } from './character-world-character-foundation'
import { worldEntitiesScenario } from './world-entities'
import { worldOwnershipTransferScenario } from './world-ownership-transfer'
import { orphanedWorldLifecycleScenario } from './orphaned-world-lifecycle'
import { worldUpdateExampleScenario } from './world-update-example'

const scenarios = new Map<string, DevScenario>([
  [campaignCharactersScenario.metadata.id, campaignCharactersScenario],
  [orphanedWorldLifecycleScenario.metadata.id, orphanedWorldLifecycleScenario],
  [
    characterWorldCharacterFoundationScenario.metadata.id,
    characterWorldCharacterFoundationScenario,
  ],
  [campaignFoundationScenario.metadata.id, campaignFoundationScenario],
  [campaignMembershipsScenario.metadata.id, campaignMembershipsScenario],
  [worldEntitiesScenario.metadata.id, worldEntitiesScenario],
  [worldOwnershipTransferScenario.metadata.id, worldOwnershipTransferScenario],
  [worldUpdateExampleScenario.metadata.id, worldUpdateExampleScenario],
])

export function getDevScenario(id: string) {
  return scenarios.get(id)
}

export function listRegisteredDevScenarios() {
  return [...scenarios.values()]
}
