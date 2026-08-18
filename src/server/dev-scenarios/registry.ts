import type { DevScenario } from '@/dev/scenario-contracts'
import { authAccountLifecycleScenario } from './auth-account-lifecycle'
import { campaignCharactersScenario } from './campaign-characters'
import { campaignFoundationScenario } from './campaign-foundation'
import { campaignMembershipsScenario } from './campaign-memberships'
import { characterCopyMigrationScenario } from './character-copy-migration'
import { characterEntryFlowScenario } from './character-entry-flow'
import { characterWorldCharacterFoundationScenario } from './character-world-character-foundation'
import { chooseEntityEntryScenario } from './choose-entity-entry'
import { orphanedWorldLifecycleScenario } from './orphaned-world-lifecycle'
import { worldEntitiesScenario } from './world-entities'
import { worldOwnershipTransferScenario } from './world-ownership-transfer'
import { worldUpdateExampleScenario } from './world-update-example'

const scenarios = new Map<string, DevScenario>([
  [authAccountLifecycleScenario.metadata.id, authAccountLifecycleScenario],
  [characterCopyMigrationScenario.metadata.id, characterCopyMigrationScenario],
  [campaignCharactersScenario.metadata.id, campaignCharactersScenario],
  [orphanedWorldLifecycleScenario.metadata.id, orphanedWorldLifecycleScenario],
  [
    characterWorldCharacterFoundationScenario.metadata.id,
    characterWorldCharacterFoundationScenario,
  ],
  [characterEntryFlowScenario.metadata.id, characterEntryFlowScenario],
  [chooseEntityEntryScenario.metadata.id, chooseEntityEntryScenario],
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
