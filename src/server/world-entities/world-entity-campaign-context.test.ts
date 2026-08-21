import { describe, expect, it } from 'vitest'
import {
  filterEntityRelationshipsForCampaignContext,
  filterWorldEntitiesForCampaignContext,
} from './world-entity-campaign-context'
import type {
  EntityRelationshipRecord,
  VisibilityScope,
  WorldEntityRecord,
} from './world-entity-repository'

const campaignX = 'campaign-x'
const campaignY = 'campaign-y'
const now = new Date('2026-08-21T00:00:00.000Z')

function entity(
  id: string,
  visibilityScope: VisibilityScope,
  options: Partial<WorldEntityRecord> = {},
): WorldEntityRecord {
  return {
    id,
    worldId: 'world-1',
    type: 'location',
    name: id,
    description: null,
    image: null,
    data: {},
    createdById: 'user-1',
    visibilityScope,
    visibilityCampaignId: null,
    visibilityUserId: null,
    createdAt: now,
    updatedAt: now,
    ...options,
  }
}

function relationship(
  id: string,
  sourceEntityId: string,
  targetEntityId: string,
  visibilityScope: VisibilityScope,
  visibilityCampaignId: string | null = null,
): EntityRelationshipRecord {
  return {
    id,
    worldId: 'world-1',
    sourceEntityId,
    targetEntityId,
    relationshipType: 'CONNECTED_TO',
    label: null,
    metadata: {},
    createdById: 'user-1',
    visibilityScope,
    visibilityCampaignId,
    visibilityUserId: null,
    createdAt: now,
    updatedAt: now,
  }
}

describe('WorldEntity Campaign context filtering', () => {
  it('keeps World-wide and personal content while excluding other Campaign scopes', () => {
    const entities = [
      entity('world', 'WORLD'),
      entity('campaign-x', 'CAMPAIGN', {
        visibilityCampaignId: campaignX,
      }),
      entity('campaign-y', 'CAMPAIGN', {
        visibilityCampaignId: campaignY,
      }),
      entity('gm-x', 'GM', { visibilityCampaignId: campaignX }),
      entity('gm-y', 'GM', { visibilityCampaignId: campaignY }),
      entity('player-x', 'PLAYER', {
        visibilityCampaignId: campaignX,
        visibilityUserId: 'user-1',
      }),
      entity('player-y', 'PLAYER', {
        visibilityCampaignId: campaignY,
        visibilityUserId: 'user-1',
      }),
      entity('player-unscoped', 'PLAYER', { visibilityUserId: 'user-1' }),
      entity('private', 'PRIVATE'),
    ]

    expect(
      filterWorldEntitiesForCampaignContext(entities, campaignX).map(
        (choice) => choice.id,
      ),
    ).toEqual([
      'world',
      'campaign-x',
      'gm-x',
      'player-x',
      'player-unscoped',
      'private',
    ])
  })

  it('shows Character-backed entities only when the WorldCharacter participates in the active Campaign', () => {
    const entities = [
      entity('character-x', 'WORLD', {
        worldCharacterId: 'wc-x',
        worldCharacterCampaignIds: [campaignX],
      }),
      entity('character-y', 'WORLD', {
        worldCharacterId: 'wc-y',
        worldCharacterCampaignIds: [campaignY],
      }),
      entity('character-both', 'WORLD', {
        worldCharacterId: 'wc-both',
        worldCharacterCampaignIds: [campaignX, campaignY],
      }),
    ]

    expect(
      filterWorldEntitiesForCampaignContext(entities, campaignX).map(
        (choice) => choice.id,
      ),
    ).toEqual(['character-x', 'character-both'])
  })

  it('keeps only relationships valid in the active Campaign and between visible entities', () => {
    const allEntities = [
      entity('world', 'WORLD'),
      entity('x', 'CAMPAIGN', { visibilityCampaignId: campaignX }),
      entity('y', 'CAMPAIGN', { visibilityCampaignId: campaignY }),
    ]
    const visibleEntities = filterWorldEntitiesForCampaignContext(
      allEntities,
      campaignX,
    )
    const relationships = [
      relationship('world-link', 'world', 'x', 'WORLD'),
      relationship('x-link', 'world', 'x', 'CAMPAIGN', campaignX),
      relationship('y-scope-link', 'world', 'x', 'CAMPAIGN', campaignY),
      relationship('hidden-endpoint-link', 'world', 'y', 'WORLD'),
    ]

    expect(
      filterEntityRelationshipsForCampaignContext(
        relationships,
        visibleEntities,
        campaignX,
      ).map((choice) => choice.id),
    ).toEqual(['world-link', 'x-link'])
  })

  it('does not narrow the normal World view when no Campaign context is active', () => {
    const entities = [
      entity('campaign-x', 'CAMPAIGN', {
        visibilityCampaignId: campaignX,
      }),
      entity('campaign-y', 'CAMPAIGN', {
        visibilityCampaignId: campaignY,
      }),
    ]

    expect(filterWorldEntitiesForCampaignContext(entities)).toBe(entities)
  })
})
