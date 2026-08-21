import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { worldEntityService } from '../world-entities'
import {
  hasWorldPermission,
  WORLD_PERMISSIONS,
  WorldAuthorizationService,
} from '../worlds/world-permissions'
import {
  compareWorldPositions,
  resolveWorldDate,
  type WorldDateInput,
} from './world-date-resolver'
import {
  worldEventEndBeforeStart,
  worldEventEntityInvalid,
  worldEventNotFound,
  worldReckoningInUse,
  worldReckoningNotFound,
  worldTimelineNotFound,
} from './world-event-errors'
import type {
  WorldEventRecord,
  WorldEventRepository,
  WorldReckoningRecord,
} from './world-event-repository'
import { PrismaWorldEventRepository } from './prisma-world-event-repository'

export interface CreateWorldEventInput {
  actorUserId: string
  worldId: string
  title: string
  description?: string | null
  startDate: WorldDateInput
  endDate?: WorldDateInput
  entityIds?: string[]
}

export interface UpdateWorldEventInput {
  title: string
  description?: string | null
  startDate: WorldDateInput
  endDate?: WorldDateInput
  entityIds?: string[]
}

export interface CreateWorldReckoningInput {
  actorUserId: string
  worldId: string
  name: string
  anchorDate: WorldDateInput
  beforeLabel: string
  beforeAbbreviation?: string | null
  afterLabel: string
  afterAbbreviation?: string | null
}

export type WorldEventIdFactory = () => string

export type VisibleEntityIdsLoader = (
  worldId: string,
  userId: string,
) => Promise<ReadonlySet<string>>

const defaultVisibleEntityIdsLoader: VisibleEntityIdsLoader = async (
  worldId,
  userId,
) =>
  new Set(
    (await worldEntityService.listEntities(worldId, userId)).map(
      (entity) => entity.id,
    ),
  )

function normalizedEntityIds(entityIds: readonly string[] | undefined) {
  return [...new Set(entityIds ?? [])]
}

async function assertVisibleEntityIds(
  loadVisibleEntityIds: VisibleEntityIdsLoader,
  worldId: string,
  userId: string,
  entityIds: readonly string[],
) {
  if (entityIds.length === 0) return
  const visible = await loadVisibleEntityIds(worldId, userId)
  if (entityIds.some((entityId) => !visible.has(entityId))) {
    throw worldEventEntityInvalid()
  }
}

function assertDateOrder(startPosition: string, endPosition: string | null) {
  if (
    endPosition !== null &&
    compareWorldPositions(endPosition, startPosition) < 0
  ) {
    throw worldEventEndBeforeStart()
  }
}

export class WorldEventService {
  constructor(
    private readonly repository: WorldEventRepository,
    private readonly createId: WorldEventIdFactory = randomUUID,
    private readonly loadVisibleEntityIds: VisibleEntityIdsLoader =
      defaultVisibleEntityIdsLoader,
  ) {}

  async loadMainTimeline(worldId: string, userId: string) {
    const authorization = new WorldAuthorizationService(this.repository)
    const access = await authorization.assertPermission(
      userId,
      worldId,
      WORLD_PERMISSIONS.VIEW_WORLD,
    )
    const timeline = await this.repository.findMainTimeline(worldId)
    if (!timeline) throw worldTimelineNotFound(worldId)

    const [events, reckonings] = await Promise.all([
      this.repository.listEvents(timeline.id),
      this.repository.listReckonings(worldId),
    ])

    return {
      timeline,
      events,
      reckonings,
      canEditEvents: hasWorldPermission(access, WORLD_PERMISSIONS.EDIT_CONTENT),
      canManageChronology: hasWorldPermission(
        access,
        WORLD_PERMISSIONS.MANAGE_CONFIGURATION,
      ),
    }
  }

  async loadEvent(
    worldId: string,
    userId: string,
    eventId: string,
  ): Promise<WorldEventRecord | null> {
    const authorization = new WorldAuthorizationService(this.repository)
    await authorization.assertPermission(
      userId,
      worldId,
      WORLD_PERMISSIONS.VIEW_WORLD,
    )
    return this.repository.findEvent(worldId, eventId)
  }

  createEvent(input: CreateWorldEventInput) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        input.actorUserId,
        input.worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )

      const [timeline, reckonings] = await Promise.all([
        repository.findMainTimeline(input.worldId),
        repository.listReckonings(input.worldId),
      ])
      if (!timeline) throw worldTimelineNotFound(input.worldId)

      const start = resolveWorldDate(input.startDate, reckonings)
      const end = input.endDate
        ? resolveWorldDate(input.endDate, reckonings)
        : null
      assertDateOrder(start.worldPosition, end?.worldPosition ?? null)

      const entityIds = normalizedEntityIds(input.entityIds)
      await assertVisibleEntityIds(
        this.loadVisibleEntityIds,
        input.worldId,
        input.actorUserId,
        entityIds,
      )

      const event = await repository.createEvent({
        id: this.createId(),
        timelineId: timeline.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        startWorldPosition: start.worldPosition,
        endWorldPosition: end?.worldPosition ?? null,
        startWorldDateLabel: start.worldDateLabel,
        endWorldDateLabel: end?.worldDateLabel ?? null,
        startReckoningId: start.reckoningId,
        startReckoningDirection: start.direction,
        endReckoningId: end?.reckoningId ?? null,
        endReckoningDirection: end?.direction ?? null,
        type: 'event',
        data: {},
      })
      await repository.replaceEventEntities(event.id, entityIds)
      return (await repository.findEvent(input.worldId, event.id)) ?? event
    })
  }

  updateEvent(
    worldId: string,
    userId: string,
    eventId: string,
    input: UpdateWorldEventInput,
  ) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        userId,
        worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )

      const current = await repository.findEvent(worldId, eventId)
      if (!current) throw worldEventNotFound(eventId)
      const reckonings = await repository.listReckonings(worldId)
      const start = resolveWorldDate(input.startDate, reckonings)
      const end = input.endDate
        ? resolveWorldDate(input.endDate, reckonings)
        : null
      assertDateOrder(start.worldPosition, end?.worldPosition ?? null)

      const entityIds = normalizedEntityIds(input.entityIds)
      await assertVisibleEntityIds(
        this.loadVisibleEntityIds,
        worldId,
        userId,
        entityIds,
      )

      const updated = await repository.updateEvent(worldId, eventId, {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        startWorldPosition: start.worldPosition,
        endWorldPosition: end?.worldPosition ?? null,
        startWorldDateLabel: start.worldDateLabel,
        endWorldDateLabel: end?.worldDateLabel ?? null,
        startReckoningId: start.reckoningId,
        startReckoningDirection: start.direction,
        endReckoningId: end?.reckoningId ?? null,
        endReckoningDirection: end?.direction ?? null,
      })
      if (!updated) throw worldEventNotFound(eventId)
      await repository.replaceEventEntities(eventId, entityIds)
      return (await repository.findEvent(worldId, eventId)) ?? updated
    })
  }

  deleteEvent(worldId: string, userId: string, eventId: string) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        userId,
        worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )
      if (!(await repository.deleteEvent(worldId, eventId))) {
        throw worldEventNotFound(eventId)
      }
    })
  }

  createReckoning(input: CreateWorldReckoningInput) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        input.actorUserId,
        input.worldId,
        WORLD_PERMISSIONS.MANAGE_CONFIGURATION,
      )
      const reckonings = await repository.listReckonings(input.worldId)
      const anchor = resolveWorldDate(input.anchorDate, reckonings)

      return repository.createReckoning({
        id: this.createId(),
        worldId: input.worldId,
        name: input.name.trim(),
        anchorWorldPosition: anchor.worldPosition,
        anchorWorldDateLabel: anchor.worldDateLabel,
        beforeLabel: input.beforeLabel.trim(),
        beforeAbbreviation: input.beforeAbbreviation?.trim() || null,
        afterLabel: input.afterLabel.trim(),
        afterAbbreviation: input.afterAbbreviation?.trim() || null,
      })
    })
  }

  deleteReckoning(worldId: string, userId: string, reckoningId: string) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        userId,
        worldId,
        WORLD_PERMISSIONS.MANAGE_CONFIGURATION,
      )
      if (!(await repository.findReckoning(worldId, reckoningId))) {
        throw worldReckoningNotFound(reckoningId)
      }
      if ((await repository.countReckoningUses(worldId, reckoningId)) > 0) {
        throw worldReckoningInUse()
      }
      if (!(await repository.deleteReckoning(worldId, reckoningId))) {
        throw worldReckoningNotFound(reckoningId)
      }
    })
  }
}

export const worldEventService = new WorldEventService(
  new PrismaWorldEventRepository(prisma),
)

export type { WorldEventRecord, WorldReckoningRecord }
