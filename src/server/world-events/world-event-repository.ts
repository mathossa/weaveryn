import type { WorldAuthorizationRepository } from '../worlds/world-permissions'

export type ReckoningDirection = 'BEFORE' | 'AFTER'

export interface WorldTimelineRecord {
  id: string
  worldId: string
  name: string
}

export interface WorldReckoningRecord {
  id: string
  worldId: string
  name: string
  anchorWorldPosition: string
  anchorWorldDateLabel: string
  beforeLabel: string
  beforeAbbreviation: string | null
  afterLabel: string
  afterAbbreviation: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WorldEventRecord {
  id: string
  timelineId: string
  title: string
  description: string | null
  startWorldPosition: string
  endWorldPosition: string | null
  startWorldDateLabel: string
  endWorldDateLabel: string | null
  startReckoningId: string | null
  startReckoningDirection: ReckoningDirection | null
  endReckoningId: string | null
  endReckoningDirection: ReckoningDirection | null
  type: string
  data: unknown
  entityIds: string[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateWorldEventRecordInput {
  id: string
  timelineId: string
  title: string
  description?: string | null
  startWorldPosition: string
  endWorldPosition?: string | null
  startWorldDateLabel: string
  endWorldDateLabel?: string | null
  startReckoningId?: string | null
  startReckoningDirection?: ReckoningDirection | null
  endReckoningId?: string | null
  endReckoningDirection?: ReckoningDirection | null
  type: string
  data: Record<string, unknown>
}

export interface UpdateWorldEventRecordInput {
  title?: string
  description?: string | null
  startWorldPosition?: string
  endWorldPosition?: string | null
  startWorldDateLabel?: string
  endWorldDateLabel?: string | null
  startReckoningId?: string | null
  startReckoningDirection?: ReckoningDirection | null
  endReckoningId?: string | null
  endReckoningDirection?: ReckoningDirection | null
}

export interface CreateWorldReckoningRecordInput {
  id: string
  worldId: string
  name: string
  anchorWorldPosition: string
  anchorWorldDateLabel: string
  beforeLabel: string
  beforeAbbreviation?: string | null
  afterLabel: string
  afterAbbreviation?: string | null
}

export interface WorldEventRepository extends WorldAuthorizationRepository {
  runInTransaction<T>(
    operation: (repository: WorldEventRepository) => Promise<T>,
  ): Promise<T>
  findMainTimeline(worldId: string): Promise<WorldTimelineRecord | null>
  createEvent(input: CreateWorldEventRecordInput): Promise<WorldEventRecord>
  findEvent(worldId: string, eventId: string): Promise<WorldEventRecord | null>
  listEvents(timelineId: string): Promise<WorldEventRecord[]>
  updateEvent(
    worldId: string,
    eventId: string,
    input: UpdateWorldEventRecordInput,
  ): Promise<WorldEventRecord | null>
  deleteEvent(worldId: string, eventId: string): Promise<boolean>
  replaceEventEntities(eventId: string, entityIds: string[]): Promise<void>
  listReckonings(worldId: string): Promise<WorldReckoningRecord[]>
  findReckoning(
    worldId: string,
    reckoningId: string,
  ): Promise<WorldReckoningRecord | null>
  createReckoning(
    input: CreateWorldReckoningRecordInput,
  ): Promise<WorldReckoningRecord>
  countReckoningUses(worldId: string, reckoningId: string): Promise<number>
  deleteReckoning(worldId: string, reckoningId: string): Promise<boolean>
}
