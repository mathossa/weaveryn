import { describe, expect, it } from 'vitest'
import type { EntryWorldCharacterChoice } from './entry-selection'
import {
  resolveCharacterEntry,
  resolveWeaverEntry,
} from './entry-selection-state'

const character = (
  campaigns: Array<{ id: string; name: string }>,
): EntryWorldCharacterChoice => ({
  id: 'wc-1',
  characterId: 'character-1',
  name: 'Bodwick',
  portableName: 'Bodwick',
  image: null,
  worldId: 'world-1',
  worldName: 'Ansalon',
  createdAt: new Date('2026-08-16T20:00:00Z'),
  campaigns,
})

describe('character entry selection', () => {
  it('selects WorldCharacter context directly when it has no Campaign', () => {
    expect(resolveCharacterEntry([character([])], 'wc-1')).toMatchObject({
      kind: 'selected',
      campaign: null,
    })
  })

  it('selects the only Campaign directly', () => {
    expect(
      resolveCharacterEntry(
        [character([{ id: 'campaign-1', name: 'First Campaign' }])],
        'wc-1',
      ),
    ).toMatchObject({ kind: 'selected', campaign: { id: 'campaign-1' } })
  })

  it('asks the user to choose when multiple Campaigns are available', () => {
    expect(
      resolveCharacterEntry(
        [
          character([
            { id: 'campaign-1', name: 'First Campaign' },
            { id: 'campaign-2', name: 'Second Campaign' },
          ]),
        ],
        'wc-1',
      ),
    ).toMatchObject({ kind: 'campaign-choice' })
  })

  it('rejects a Campaign id that is not authorized for the WorldCharacter', () => {
    expect(
      resolveCharacterEntry(
        [character([{ id: 'campaign-1', name: 'First Campaign' }])],
        'wc-1',
        'campaign-other',
      ),
    ).toEqual({ kind: 'not-found' })
  })
})

describe('Weaver entry selection', () => {
  it('offers World creation when no manageable World exists', () => {
    expect(resolveWeaverEntry([])).toEqual({ kind: 'create-world' })
  })

  it('selects one manageable World directly', () => {
    expect(
      resolveWeaverEntry([{ id: 'world-1', name: 'Ansalon' }]),
    ).toMatchObject({ kind: 'selected', world: { id: 'world-1' } })
  })

  it('asks for a World when multiple manageable Worlds exist', () => {
    expect(
      resolveWeaverEntry([
        { id: 'world-1', name: 'Ansalon' },
        { id: 'world-2', name: 'Thalorin' },
      ]),
    ).toMatchObject({ kind: 'world-choice' })
  })

  it('rejects a World id outside the authorized Weaver choices', () => {
    expect(
      resolveWeaverEntry([{ id: 'world-1', name: 'Ansalon' }], 'world-other'),
    ).toEqual({ kind: 'not-found' })
  })
})
