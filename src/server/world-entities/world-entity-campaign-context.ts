import type {
  EntityRelationshipRecord,
  VisibilityRecord,
  WorldEntityRecord,
} from './world-entity-repository'

function isWorldCharacterRecord(
  record: VisibilityRecord,
): record is WorldEntityRecord {
  return (
    'worldCharacterId' in record &&
    Boolean((record as WorldEntityRecord).worldCharacterId)
  )
}

function visibleInCampaignContext(
  record: VisibilityRecord,
  campaignId: string,
) {
  if (isWorldCharacterRecord(record)) {
    return (record.worldCharacterCampaignIds ?? []).includes(campaignId)
  }

  switch (record.visibilityScope) {
    case 'CAMPAIGN':
    case 'GM':
      return record.visibilityCampaignId === campaignId
    case 'PLAYER':
      return (
        record.visibilityCampaignId === null ||
        record.visibilityCampaignId === campaignId
      )
    case 'WORLD':
    case 'PRIVATE':
      return true
  }
}

export function filterWorldEntitiesForCampaignContext(
  entities: WorldEntityRecord[],
  campaignId?: string,
) {
  if (!campaignId) return entities
  return entities.filter((entity) => visibleInCampaignContext(entity, campaignId))
}

export function filterEntityRelationshipsForCampaignContext(
  relationships: EntityRelationshipRecord[],
  visibleEntities: WorldEntityRecord[],
  campaignId?: string,
) {
  if (!campaignId) return relationships

  const visibleEntityIds = new Set(visibleEntities.map((entity) => entity.id))
  return relationships.filter(
    (relationship) =>
      visibleInCampaignContext(relationship, campaignId) &&
      visibleEntityIds.has(relationship.sourceEntityId) &&
      visibleEntityIds.has(relationship.targetEntityId),
  )
}
