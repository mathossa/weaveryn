import { describe, expect, it } from 'vitest'
import {
  adoptWorldEntityIntoWorldCharacterData,
  normalizeWorldCharacterCustomFields,
  normalizeWorldCharacterProfile,
} from './world-character-profile'

describe('WorldCharacter profile continuity', () => {
  it('adopts NPC description, profile snapshots, and custom fields on rejoin', () => {
    const adopted = adoptWorldEntityIntoWorldCharacterData(
      null,
      'Marun became a blacksmith while away.',
      {
        Personality: 'More guarded after years away.',
        'Former occupation': 'Blacksmith',
        Reputation: 5,
        Wanted: false,
      },
    )

    expect(normalizeWorldCharacterProfile(adopted)).toMatchObject({
      values: {
        whoIs: 'Marun became a blacksmith while away.',
        personality: 'More guarded after years away.',
      },
    })
    expect(normalizeWorldCharacterCustomFields(adopted)).toEqual({
      'Former occupation': 'Blacksmith',
      Reputation: 5,
      Wanted: false,
    })
  })

  it('keeps explicitly supplied WorldCharacter values ahead of imported NPC data', () => {
    const adopted = adoptWorldEntityIntoWorldCharacterData(
      {
        profile: {
          values: {
            whoIs: 'Explicit returning Character description.',
            personality: 'Explicit personality.',
          },
          hiddenFields: ['goals'],
        },
        customFields: {
          Reputation: 9,
        },
      },
      'NPC description.',
      {
        Personality: 'NPC personality.',
        Reputation: 3,
        'Former occupation': 'Blacksmith',
      },
    )

    expect(normalizeWorldCharacterProfile(adopted)).toEqual({
      values: {
        whoIs: 'Explicit returning Character description.',
        personality: 'Explicit personality.',
      },
      hiddenFields: ['goals'],
    })
    expect(normalizeWorldCharacterCustomFields(adopted)).toEqual({
      Reputation: 9,
      'Former occupation': 'Blacksmith',
    })
  })
})
