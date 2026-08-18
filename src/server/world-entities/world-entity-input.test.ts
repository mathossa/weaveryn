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

describe('World entity input parsing', () => {
  it('accepts simple structured fields and MVP visibility', () => {
    expect(
      parseCreateWorldEntityInput({
        type: '  Astral Beacon  ',
        name: '  Beacon One ',
        description: '  An old tower. ',
        data: { keeper: 'Elara', height: 82, active: true },
        contextCampaignId: campaignId,
        visibility: {
          scope: 'PLAYER',
          campaignId,
          userId,
        },
      }),
    ).toEqual({
      type: 'Astral Beacon',
      name: 'Beacon One',
      description: 'An old tower.',
      image: undefined,
      data: { keeper: 'Elara', height: 82, active: true },
      contextCampaignId: campaignId,
      visibility: {
        scope: 'PLAYER',
        campaignId,
        userId,
      },
    })
  })

  it('rejects nested or non-simple custom field values', () => {
    expect(() =>
      parseCreateWorldEntityInput({
        type: 'location',
        name: 'Moonwatch',
        data: { nested: { unsafe: true } },
      }),
    ).toThrow('must be text, a number, or a boolean')
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
})
