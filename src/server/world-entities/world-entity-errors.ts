export type WorldEntityDomainErrorCode =
  | 'WORLD_ENTITY_NOT_FOUND'
  | 'ENTITY_RELATIONSHIP_NOT_FOUND'
  | 'ENTITY_RELATIONSHIP_CROSS_WORLD'

export class WorldEntityDomainError extends Error {
  constructor(
    public readonly code: WorldEntityDomainErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'WorldEntityDomainError'
  }
}

export function worldEntityNotFound(entityId: string) {
  return new WorldEntityDomainError(
    'WORLD_ENTITY_NOT_FOUND',
    `World Entity ${entityId} was not found.`,
  )
}

export function entityRelationshipNotFound(relationshipId: string) {
  return new WorldEntityDomainError(
    'ENTITY_RELATIONSHIP_NOT_FOUND',
    `Entity relationship ${relationshipId} was not found.`,
  )
}

export function entityRelationshipCrossWorld() {
  return new WorldEntityDomainError(
    'ENTITY_RELATIONSHIP_CROSS_WORLD',
    'Both relationship entities must belong to the same World.',
  )
}
