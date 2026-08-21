import { describe, expect, it } from 'vitest'
import type { WorldRole } from '../worlds/world-role'
import { WorldDomainError } from '../worlds/world-errors'
import type {
  CreateWorldEventRecordInput,
  CreateWorldReckoningRecordInput,
  UpdateWorldEventRecordInput,
  WorldEventRecord,
  WorldEventRepository,
  WorldReckoningRecord,
} from './world-event-repository'
import { WorldEventDomainError } from './world-event-errors'
import { WorldEventService } from './world-event-service'

const worldId = '20000000-0000-4000-8000-000000000001'
const timelineId = '20000000-0000-4000-8000-000000000002'
const ownerId = '20000000-0000-4000-8000-00000000000a'
const adminId = '20000000-0000-4000-8000-00000000000b'
const memberId = '20000000-0000-4000-8000-00000000000c'
const viewerId = '20000000-0000-4000-8000-00000000000d'
const outsiderId = '20000000-0000-4000-8000-00000000000e'
const entityId = '20000000-0000-4000-8000-000000000020'
const hiddenEntityId = '20000000-0000-4000-8000-000000000021'
const eventId = '20000000-0000-4000-8000-000000000030'
const reckoningId = '20000000-0000-4000-8000-000000000040'
const now = new Date('2026-08-21T00:00:00.000Z')

class InMemoryWorldEventRepository implements WorldEventRepository {
  world = { id: worldId, ownerId }
  memberships = new Map<string, WorldRole>([
    [adminId, 'ADMIN'],
    [memberId, 'MEMBER'],
    [viewerId, 'VIEWER'],
  ])
  timeline = { id: timelineId, worldId, name: 'Main' }
  events: WorldEventRecord[] = []
  reckonings: WorldReckoningRecord[] = []

  runInTransaction<T>(
    operation: (repository: WorldEventRepository) => Promise<T>,
  ): Promise<T> {
    return operation(this)
  }

  async findWorldById(requestedWorldId: string) {
    return requestedWorldId === worldId ? this.world : null
  }

  async findMembership(requestedWorldId: string, userId: string) {
    const role =
      requestedWorldId === worldId ? this.memberships.get(userId) : undefined
    return role
      ? {
          id: `${requestedWorldId}:${userId}`,
          worldId: requestedWorldId,
          userId,
          role,
          joinedAt: now,
          updatedAt: now,
        }
      : null
  }

  async findMainTimeline(requestedWorldId: string) {
    return requestedWorldId === worldId ? this.timeline : null
  }

  async createEvent(input: CreateWorldEventRecordInput) {
    const event: WorldEventRecord = {
      ...input,
      description: input.description ?? null,
      endWorldPosition: input.endWorldPosition ?? null,
      endWorldDateLabel: input.endWorldDateLabel ?? null,
      startReckoningId: input.startReckoningId ?? null,
      startReckoningDirection: input.startReckoningDirection ?? null,
      endReckoningId: input.endReckoningId ?? null,
      endReckoningDirection: input.endReckoningDirection ?? null,
      entityIds: [],
      createdAt: now,
      updatedAt: now,
    }
    this.events.push(event)
    return event
  }

  async findEvent(requestedWorldId: string, requestedEventId: string) {
    if (requestedWorldId !== worldId) return null
    return this.events.find((event) => event.id === requestedEventId) ?? null
  }

  async listEvents(requestedTimelineId: string) {
    if (requestedTimelineId !== timelineId) return []
    return [...this.events].sort((left, right) => {
      const positionDifference =
        Number(left.startWorldPosition) - Number(right.startWorldPosition)
      if (positionDifference !== 0) return positionDifference
      return left.id.localeCompare(right.id)
    })
  }

  async updateEvent(
    requestedWorldId: string,
    requestedEventId: string,
    input: UpdateWorldEventRecordInput,
  ) {
    if (requestedWorldId !== worldId) return null
    const index = this.events.findIndex((event) => event.id === requestedEventId)
    if (index < 0) return null
    const current = this.events[index]
    if (!current) return null
    const updated: WorldEventRecord = {
      ...current,
      ...input,
      updatedAt: now,
    }
    this.events[index] = updated
    return updated
  }

  async deleteEvent(requestedWorldId: string, requestedEventId: string) {
    if (requestedWorldId !== worldId) return false
    const previousLength = this.events.length
    this.events = this.events.filter((event) => event.id !== requestedEventId)
    return this.events.length !== previousLength
  }

  async replaceEventEntities(requestedEventId: string, entityIds: string[]) {
    const event = this.events.find(
      (candidate) => candidate.id === requestedEventId,
    )
    if (event) event.entityIds = [...entityIds]
  }

  async listReckonings(requestedWorldId: string) {
    return requestedWorldId === worldId ? [...this.reckonings] : []
  }

  async findReckoning(requestedWorldId: string, requestedReckoningId: string) {
    if (requestedWorldId !== worldId) return null
    return (
      this.reckonings.find(
        (reckoning) => reckoning.id === requestedReckoningId,
      ) ?? null
    )
  }

  async createReckoning(input: CreateWorldReckoningRecordInput) {
    const reckoning: WorldReckoningRecord = {
      ...input,
      beforeAbbreviation: input.beforeAbbreviation ?? null,
      afterAbbreviation: input.afterAbbreviation ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.reckonings.push(reckoning)
    return reckoning
  }

  async countReckoningUses(
    requestedWorldId: string,
    requestedReckoningId: string,
  ) {
    if (requestedWorldId !== worldId) return 0
    return this.events.filter(
      (event) =>
        event.startReckoningId === requestedReckoningId ||
        event.endReckoningId === requestedReckoningId,
    ).length
  }

  async deleteReckoning(
    requestedWorldId: string,
    requestedReckoningId: string,
  ) {
    if (requestedWorldId !== worldId) return false
    const previousLength = this.reckonings.length
    this.reckonings = this.reckonings.filter(
      (reckoning) => reckoning.id !== requestedReckoningId,
    )
    return this.reckonings.length !== previousLength
  }

  async listEntitiesByIds(requestedWorldId: string, entityIds: string[]) {
    if (requestedWorldId !== worldId) return []
    return entityIds
      .filter((id) => id === entityId || id === hiddenEntityId)
      .map((id) => ({ id, worldId }))
  }

  async listVisibleEntityIds(
    requestedWorldId: string,
    _userId: string,
    entityIds: string[],
  ) {
    if (requestedWorldId !== worldId) return []
    return entityIds.filter((id) => id === entityId)
  }
}

function makeService(
  repository = new InMemoryWorldEventRepository(),
  ids: string[] = [eventId],
) {
  let index = 0
  return {
    repository,
    service: new WorldEventService(repository, () => ids[index++] ?? eventId),
  }
}

describe('WorldEventService', () => {
  it('lets a World MEMBER create a point event and link visible entities', async () => {
    const { repository, service } = makeService()
    const event = await service.createEvent({
      actorUserId: memberId,
      worldId,
      title: 'The First Beacon',
      description: 'A light is kindled on the mountain.',
      startDate: { year: '120' },
      entityIds: [entityId],
    })

    expect(event.startWorldPosition).toBe('120')
    expect(event.startWorldDateLabel).toBe('Year 120')
    expect(event.endWorldPosition).toBeNull()
    expect(event.entityIds).toEqual([entityId])
    expect(repository.events).toHaveLength(1)
  })

  it('rejects an end date before the start date', async () => {
    const { service } = makeService()
    await expect(
      service.createEvent({
        actorUserId: memberId,
        worldId,
        title: 'Impossible reign',
        startDate: { year: '200' },
        endDate: { year: '199' },
      }),
    ).rejects.toMatchObject({
      code: 'WORLD_EVENT_END_BEFORE_START',
    })
  })

  it('lets a MEMBER edit chronology and linked entities without granting configuration', async () => {
    const { repository, service } = makeService()
    const created = await service.createEvent({
      actorUserId: memberId,
      worldId,
      title: 'Old title',
      startDate: { year: '25' },
      entityIds: [entityId],
    })

    const updated = await service.updateEvent(worldId, memberId, created.id, {
      title: 'New title',
      startDate: { year: '30' },
      entityIds: [],
    })

    expect(updated.title).toBe('New title')
    expect(updated.startWorldPosition).toBe('30')
    expect(updated.entityIds).toEqual([])
    await expect(
      service.createReckoning({
        actorUserId: memberId,
        worldId,
        name: 'Forbidden reckoning',
        anchorDate: { year: '0' },
        beforeLabel: 'Before',
        afterLabel: 'After',
      }),
    ).rejects.toBeInstanceOf(WorldDomainError)
    expect(repository.reckonings).toHaveLength(0)
  })

  it('keeps VIEWER and outsiders read-only', async () => {
    const { service } = makeService()
    for (const actorUserId of [viewerId, outsiderId]) {
      await expect(
        service.createEvent({
          actorUserId,
          worldId,
          title: 'Forbidden history',
          startDate: { year: '1' },
        }),
      ).rejects.toBeInstanceOf(WorldDomainError)
    }
  })

  it('lets ADMIN configure overlapping reckonings and resolves both to one position', async () => {
    const cataclysmId = reckoningId
    const rebuildId = '20000000-0000-4000-8000-000000000041'
    const { service } = makeService(new InMemoryWorldEventRepository(), [
      cataclysmId,
      rebuildId,
    ])

    const cataclysm = await service.createReckoning({
      actorUserId: adminId,
      worldId,
      name: 'Cataclysm',
      anchorDate: { year: '0' },
      beforeLabel: 'Before Cataclysm',
      beforeAbbreviation: 'BC',
      afterLabel: 'After Cataclysm',
      afterAbbreviation: 'AC',
    })
    const rebuild = await service.createReckoning({
      actorUserId: adminId,
      worldId,
      name: 'Rebuild',
      anchorDate: {
        year: '200',
        reckoningId: cataclysm.id,
        direction: 'AFTER',
      },
      beforeLabel: 'Before Rebuild',
      beforeAbbreviation: 'BR',
      afterLabel: 'After Rebuild',
      afterAbbreviation: 'AR',
    })

    const first = await service.createEvent({
      actorUserId: memberId,
      worldId,
      title: 'One century after the Cataclysm',
      startDate: {
        year: '100',
        reckoningId: cataclysm.id,
        direction: 'AFTER',
      },
    })
    const second = await service.createEvent({
      actorUserId: memberId,
      worldId,
      title: 'One century before Rebuild',
      startDate: {
        year: '100',
        reckoningId: rebuild.id,
        direction: 'BEFORE',
      },
    })

    expect(first.startWorldPosition).toBe('100')
    expect(first.startWorldDateLabel).toBe('100 AC')
    expect(second.startWorldPosition).toBe('100')
    expect(second.startWorldDateLabel).toBe('100 BR')
  })

  it('refuses hidden or cross-World entity links', async () => {
    const { service } = makeService()
    await expect(
      service.createEvent({
        actorUserId: memberId,
        worldId,
        title: 'Hidden link',
        startDate: { year: '1' },
        entityIds: [hiddenEntityId],
      }),
    ).rejects.toMatchObject({ code: 'WORLD_EVENT_ENTITY_FORBIDDEN' })
  })

  it('prevents removing a reckoning while an event uses it', async () => {
    const { service } = makeService(new InMemoryWorldEventRepository(), [
      reckoningId,
      eventId,
    ])
    const reckoning = await service.createReckoning({
      actorUserId: ownerId,
      worldId,
      name: 'Age of Ash',
      anchorDate: { year: '500' },
      beforeLabel: 'Before Ash',
      beforeAbbreviation: 'BA',
      afterLabel: 'After Ash',
      afterAbbreviation: 'AA',
    })
    await service.createEvent({
      actorUserId: memberId,
      worldId,
      title: 'Ashfall',
      startDate: {
        year: '0',
        reckoningId: reckoning.id,
        direction: 'AFTER',
      },
    })

    await expect(
      service.deleteReckoning(worldId, ownerId, reckoning.id),
    ).rejects.toBeInstanceOf(WorldEventDomainError)
  })
})
