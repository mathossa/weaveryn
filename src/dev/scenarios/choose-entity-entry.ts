export interface ChooseEntityEntryPreferenceState {
  entryKey: string
  pinned: boolean
  lastUsedAt: string | null
  worldCharacterId: string | null
  campaignId: string | null
  worldId: string | null
}

export interface ChooseEntityEntryState {
  worldCharacter: {
    id: string
    name: string
    worldName: string
    campaigns: { id: string; name: string }[]
  } | null
  preferences: ChooseEntityEntryPreferenceState[]
}

export type ChooseEntityEntryAction =
  | { action: 'pin-first-campaign' }
  | { action: 'use-second-campaign' }
  | { action: 'use-weaver-second-campaign' }
