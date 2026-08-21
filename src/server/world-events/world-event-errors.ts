export type WorldEventErrorCode =
  | 'WORLD_TIMELINE_NOT_FOUND'
  | 'WORLD_EVENT_NOT_FOUND'
  | 'WORLD_EVENT_DATE_INVALID'
  | 'WORLD_EVENT_END_BEFORE_START'
  | 'WORLD_EVENT_ENTITY_INVALID'
  | 'WORLD_RECKONING_NOT_FOUND'
  | 'WORLD_RECKONING_IN_USE'
  | 'WORLD_RECKONING_INVALID'

export class WorldEventDomainError extends Error {
  constructor(
    public readonly code: WorldEventErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'WorldEventDomainError'
  }
}

export function worldTimelineNotFound(worldId: string) {
  return new WorldEventDomainError(
    'WORLD_TIMELINE_NOT_FOUND',
    `The main timeline for World ${worldId} was not found.`,
  )
}

export function worldEventNotFound(eventId: string) {
  return new WorldEventDomainError(
    'WORLD_EVENT_NOT_FOUND',
    `World event ${eventId} was not found.`,
  )
}

export function worldEventDateInvalid(message: string) {
  return new WorldEventDomainError('WORLD_EVENT_DATE_INVALID', message)
}

export function worldEventEndBeforeStart() {
  return new WorldEventDomainError(
    'WORLD_EVENT_END_BEFORE_START',
    'An event cannot end before it starts.',
  )
}

export function worldEventEntityInvalid() {
  return new WorldEventDomainError(
    'WORLD_EVENT_ENTITY_INVALID',
    'Every linked entity must be visible to you and belong to the same World.',
  )
}

export function worldReckoningNotFound(reckoningId: string) {
  return new WorldEventDomainError(
    'WORLD_RECKONING_NOT_FOUND',
    `World reckoning ${reckoningId} was not found.`,
  )
}

export function worldReckoningInUse() {
  return new WorldEventDomainError(
    'WORLD_RECKONING_IN_USE',
    'This year system is already used by one or more events and cannot be removed.',
  )
}

export function worldReckoningInvalid(message: string) {
  return new WorldEventDomainError('WORLD_RECKONING_INVALID', message)
}
