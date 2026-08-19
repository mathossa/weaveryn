import { describe, expect, it } from 'vitest'
import {
  parseCreateEntityRelationshipInput,
  parseCreateWorldEntityInput,
  parseUpdateWorldEntityInput,
} from './world-entity-input'

const campaignId = '20000000-0000-4000-8000-000000000001'
const userId = '20000000-0000-4000-8000-000000000002'
const sourceId = '20000000-0000-4000-8000-000000000003'
const targetId = '20000000-0000-4000-8000-000000000004'
const canonicalDatabaseUuid = '20000000-0000-0000-0000-000000000005'

describe('World entity input parsing', () => {
  it('accepts simple structured fields, image focus, initial relationships, and MVP visibility', () => {
    expect(
      parseCreateWorldEntityInput({
        type: '  Astral Beacon  ',
        name: '  Beacon One ',
        description: '  An old tower. ',
        imageFocusX: 72,
        imageFocusY: 31,
        data: { keeper: 'Elara', height: 82, active: true },
        contextCampaignId: campaignId,
        visibility: {
          scope: 'PLAYER',
          campaignId,
          userId,
        },
        initialRelationships: [
          {
            targetEntityId: targetId,
            relationshipType: '  PROTECTS ',
            label: ' Northern approach ',
          },
        ],
      }),
    ).toEqual({
      type: 'Astral Beacon',
      name: 'Beacon One',
      description: 'An old tower.',
      image: undefined,
      imageFocusX: 72,
      imageFocusY: 31,
      data: { keeper: 'Elara', height: 82, active: true },
      contextCampaignId: campaignId,
      visibility: {
        scope: 'PLAYER',
        campaignId,
        userId,
      },
      initialRelationships: [
        {
          targetEntityId: targetId,
          relationshipType: 'PROTECTS',
          label: 'Northern approach',
        },
      ],
    })
  })

  it('rejects nested custom fields and invalid image focus', () => {
    expect(() =>
      parseCreateWorldEntityInput({
        type: 'location',
        name: 'Moonwatch',
        data: { nested: { unsafe: true } },
      }),
    ).toThrow('must be text, a number, or a boolean')
    expect(() =>
      parseCreateWorldEntityInput({
        type: 'location',
        name: 'Moonwatch',
        imageFocusX: 101,
      }),
    ).toThrow('Image focus X must be an integer from 0 to 100')
  })

  it('requires at least one update and validates UUID targets', () => {
    expect(() => parseUpdateWorldEntityInput({})).toThrow(
      'At least one entity field',
    )
    expect(() =>
      parseUpdateWorldEntityInput({
        visibility: { scope: 'CAMPAIGN', campaignId: 'not-a-uuid' },
      }),
    ).toThrow('Visibility Campaign must be a valid UUID')
  })

  it('parses relationship creation without exposing arbitrary metadata JSON', () => {
    expect(
      parseCreateEntityRelationshipInput({
        sourceEntityId: sourceId,
        targetEntityId: targetId,
        relationshipType: '  HOSTS ',
        label: ' Guild headquarters ',
      }),
    ).toEqual({
      sourceEntityId: sourceId,
      targetEntityId: targetId,
      relationshipType: 'HOSTS',
      label: 'Guild headquarters',
      contextCampaignId: undefined,
      visibility: undefined,
    })
  })

  it('accepts canonical UUID values that PostgreSQL accepts for entity IDs', () => {
    expect(
      parseCreateEntityRelationshipInput({
        sourceEntityId: sourceId,
        targetEntityId: canonicalDatabaseUuid,
        relationshipType: 'KNOWS',
      }),
    ).toMatchObject({
      sourceEntityId: sourceId,
      targetEntityId: canonicalDatabaseUuid,
      relationshipType: 'KNOWS',
    })
  })
})
