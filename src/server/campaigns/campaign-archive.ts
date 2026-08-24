export interface ArchivedWorldSnapshot {
  version: 1
  world: {
    id: string
    name: string
    description: string | null
  }
  timeline: {
    id: string
    name: string
  } | null
  finalContext: {
    worldPosition: string | null
    worldDateLabel: string | null
    location: {
      id: string
      name: string
    } | null
  }
}

export interface CreateArchivedWorldSnapshotInput {
  world: ArchivedWorldSnapshot['world']
  timeline: ArchivedWorldSnapshot['timeline']
  currentWorldPosition: string | null
  currentWorldDateLabel: string | null
  currentLocation: ArchivedWorldSnapshot['finalContext']['location']
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function hasIdentity(value: unknown): value is { id: string; name: string } {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  )
}

export function isArchivedWorldSnapshot(
  value: unknown,
): value is ArchivedWorldSnapshot {
  if (!isRecord(value) || value.version !== 1) return false
  const world = value.world
  if (
    !isRecord(world) ||
    typeof world.id !== 'string' ||
    typeof world.name !== 'string' ||
    !isNullableString(world.description)
  )
    return false
  if (value.timeline !== null && !hasIdentity(value.timeline)) return false
  if (!isRecord(value.finalContext)) return false
  if (!isNullableString(value.finalContext.worldPosition)) return false
  if (!isNullableString(value.finalContext.worldDateLabel)) return false
  return (
    value.finalContext.location === null ||
    hasIdentity(value.finalContext.location)
  )
}

export function assertArchivedWorldSnapshot(
  value: unknown,
): asserts value is ArchivedWorldSnapshot {
  if (!isArchivedWorldSnapshot(value)) {
    throw new Error('Campaign archived World snapshot is invalid.')
  }
}

export function createArchivedWorldSnapshot(
  input: CreateArchivedWorldSnapshotInput,
): ArchivedWorldSnapshot {
  const snapshot: ArchivedWorldSnapshot = {
    version: 1,
    world: { ...input.world },
    timeline: input.timeline ? { ...input.timeline } : null,
    finalContext: {
      worldPosition: input.currentWorldPosition,
      worldDateLabel: input.currentWorldDateLabel,
      location: input.currentLocation ? { ...input.currentLocation } : null,
    },
  }
  assertArchivedWorldSnapshot(snapshot)
  return snapshot
}
