export type WorldEventsActor = 'MEMBER' | 'VIEWER'

export type WorldEventsAction =
  | { action: 'create-point'; actor: WorldEventsActor }
  | { action: 'create-duration'; actor: WorldEventsActor }
  | { action: 'create-invalid-duration'; actor: 'MEMBER' }

export interface WorldEventsState {
  world: {
    id: string
    name: string
  }
  timeline: {
    id: string
    name: string
  }
  reckonings: Array<{
    id: string
    name: string
    anchorWorldPosition: string
    anchorWorldDateLabel: string
    beforeAbbreviation: string | null
    afterAbbreviation: string | null
  }>
  entities: Array<{
    id: string
    name: string
    type: string
  }>
  events: Array<{
    id: string
    title: string
    startWorldPosition: string
    endWorldPosition: string | null
    startWorldDateLabel: string
    endWorldDateLabel: string | null
    entityIds: string[]
  }>
}

export function isWorldEventsAction(
  value: unknown,
): value is WorldEventsAction {
  if (!value || typeof value !== 'object') return false
  const input = value as Record<string, unknown>
  const keys = Object.keys(input).sort()
  if (keys.length !== 2 || keys[0] !== 'action' || keys[1] !== 'actor') {
    return false
  }

  if (input.action === 'create-point' || input.action === 'create-duration') {
    return input.actor === 'MEMBER' || input.actor === 'VIEWER'
  }

  return input.action === 'create-invalid-duration' && input.actor === 'MEMBER'
}
