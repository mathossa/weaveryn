export type WorldEntityDomainErrorCode =
  | 'WORLD_ENTITY_NOT_FOUND'
  | 'ENTITY_RELATIONSHIP_NOT_FOUND'
  | 'ENTITY_RELATIONSHIP_CROSS_WORLD'
  | 'WORLD_ENTITY_VISIBILITY_INVALID'
  | 'WORLD_ENTITY_TYPE_SCOPE_INVALID'
  | 'WORLD_ENTITY_TYPE_NOT_FOUND'
  | 'WORLD_ENTITY_TYPE_IN_USE'

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

export function worldEntityVisibilityInvalid(message: string) {
  return new WorldEntityDomainError('WORLD_ENTITY_VISIBILITY_INVALID', message)
}

export function worldEntityTypeScopeInvalid(message: string) {
  return new WorldEntityDomainError('WORLD_ENTITY_TYPE_SCOPE_INVALID', message)
}

export function worldEntityTypeNotFound(typeId: string) {
  return new WorldEntityDomainError(
    'WORLD_ENTITY_TYPE_NOT_FOUND',
    `Custom World entity type ${typeId} was not found.`,
  )
}

export function worldEntityTypeInUse(name: string, count: number) {
  return new WorldEntityDomainError(
    'WORLD_ENTITY_TYPE_IN_USE',
    `${name} cannot be deleted while ${count} ${count === 1 ? 'entity uses' : 'entities use'} this type.`,
  )
}
