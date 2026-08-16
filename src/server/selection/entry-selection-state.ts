import type {
  EntryCampaignChoice,
  EntryWorldCharacterChoice,
  WeaverWorldChoice,
} from './entry-selection'

export type CharacterEntryState =
  | {
      kind: 'campaign-choice'
      character: EntryWorldCharacterChoice
      campaigns: EntryCampaignChoice[]
    }
  | {
      kind: 'selected'
      character: EntryWorldCharacterChoice
      campaign: EntryCampaignChoice | null
    }
  | { kind: 'not-found' }

export function resolveCharacterEntry(
  characters: EntryWorldCharacterChoice[],
  worldCharacterId: string,
  selectedCampaignId?: string,
): CharacterEntryState {
  const character = characters.find((choice) => choice.id === worldCharacterId)
  if (!character) return { kind: 'not-found' }

  if (selectedCampaignId) {
    const campaign = character.campaigns.find(
      (choice) => choice.id === selectedCampaignId,
    )
    return campaign
      ? { kind: 'selected', character, campaign }
      : { kind: 'not-found' }
  }

  if (character.campaigns.length > 1) {
    return {
      kind: 'campaign-choice',
      character,
      campaigns: character.campaigns,
    }
  }

  return {
    kind: 'selected',
    character,
    campaign: character.campaigns[0] ?? null,
  }
}

export type WeaverEntryState =
  | { kind: 'create-world' }
  | { kind: 'world-choice'; worlds: WeaverWorldChoice[] }
  | { kind: 'selected'; world: WeaverWorldChoice }
  | { kind: 'not-found' }

export function resolveWeaverEntry(
  worlds: WeaverWorldChoice[],
  selectedWorldId?: string,
): WeaverEntryState {
  if (selectedWorldId) {
    const world = worlds.find((choice) => choice.id === selectedWorldId)
    return world ? { kind: 'selected', world } : { kind: 'not-found' }
  }

  if (worlds.length === 0) return { kind: 'create-world' }
  if (worlds.length === 1) return { kind: 'selected', world: worlds[0] }
  return { kind: 'world-choice', worlds }
}
