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
  ) {
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
    return this.events
      .filter((event) => event.timelineId === requestedTimelineId)
      .sort((left, right) =>
        BigInt(left.startWorldPosition) < BigInt(right.startWorldPosition)
          ? -1
          : BigInt(left.startWorldPosition) > BigInt(right.startWorldPosition)
            ? 1
            : 0,
      )
  }

  async updateEvent(
    requestedWorldId: string,
    requestedEventId: string,
    input: UpdateWorldEventRecordInput,
  ) {
    const event = await this.findEvent(requestedWorldId, requestedEventId)
    if (!event) return null
    Object.assign(event, input, { updatedAt: now })
    return event
  }

  async deleteEvent(requestedWorldId: string, requestedEventId: string) {
    const index = this.events.findIndex(
      (event) => event.id === requestedEventId && requestedWorldId === worldId,
    )
    if (index < 0) return false
    this.events.splice(index, 1)
    return true
  }

  async replaceEventEntities(requestedEventId: string, entityIds: string[]) {
    const event = this.events.find((candidate) => candidate.id === requestedEventId)
    if (event) event.entityIds = [...entityIds]
  }

  async listReckonings(requestedWorldId: string) {
    return requestedWorldId === worldId ? this.reckonings : []
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

  async countReckoningUses(requestedWorldId: string, requestedReckoningId: string) {
    if (requestedWorldId !== worldId) return 0
    return this.events.filter(
      (event) =>
        event.startReckoningId === requestedReckoningId ||
        event.endReckoningId === requestedReckoningId,
    ).length
  }

  async deleteReckoning(requestedWorldId: string, requestedReckoningId: string) {
    if (requestedWorldId !== worldId) return false
    const index = this.reckonings.findIndex(
      (reckoning) => reckoning.id === requestedReckoningId,
    )
    if (index < 0) return false
    this.reckonings.splice(index, 1)
    return true
  }
}

function createHarness() {
  const repository = new InMemoryWorldEventRepository()
  let nextId = eventId
  const service = new WorldEventService(
    repository,
    () => nextId,
    async (_requestedWorldId, userId) =>
      new Set(userId === outsiderId ? [] : [entityId]),
  )
  return {
    repository,
    service,
    useReckoningId() {
      nextId = reckoningId
    },
  }
}

function eventInput(actorUserId: string) {
  return {
    actorUserId,
    worldId,
    title: 'Fall of Moonwatch',
    description: 'The Red Legion captures Moonwatch Keep.',
    startDate: { year: '1247' },
    entityIds: [entityId],
  }
}

describe('WorldEventService', () => {
  it('allows a Threadwalker to create canonical World history', async () => {
    const { service } = createHarness()
    const event = await service.createEvent(eventInput(memberId))

    expect(event).toMatchObject({
      title: 'Fall of Moonwatch',
      startWorldPosition: '1247',
      startWorldDateLabel: 'Year 1247',
      entityIds: [entityId],
    })
  })

  it('allows a Threadwatcher to read but not edit World history', async () => {
    const { service } = createHarness()
    await service.createEvent(eventInput(memberId))

    await expect(service.loadMainTimeline(worldId, viewerId)).resolves.toMatchObject({
      canEditEvents: false,
      events: [expect.objectContaining({ id: eventId })],
    })
    await expect(service.createEvent(eventInput(viewerId))).rejects.toMatchObject({
      code: 'WORLD_PERMISSION_DENIED',
    } satisfies Partial<WorldDomainError>)
  })

  it('rejects a duration whose end precedes its start', async () => {
    const { service } = createHarness()
    await expect(
      service.createEvent({
        ...eventInput(memberId),
        startDate: { year: '1253' },
        endDate: { year: '1247' },
      }),
    ).rejects.toMatchObject({
      code: 'WORLD_EVENT_END_BEFORE_START',
    } satisfies Partial<WorldEventDomainError>)
  })

  it('rejects linked entities that are not visible in the World', async () => {
    const { service } = createHarness()
    await expect(
      service.createEvent({
        ...eventInput(memberId),
        entityIds: [hiddenEntityId],
      }),
    ).rejects.toMatchObject({
      code: 'WORLD_EVENT_ENTITY_INVALID',
    } satisfies Partial<WorldEventDomainError>)
  })

  it('allows owner/admin chronology configuration but not a Threadwalker', async () => {
    const { service, useReckoningId } = createHarness()
    useReckoningId()
    const reckoning = await service.createReckoning({
      actorUserId: adminId,
      worldId,
      name: 'Cataclysm Reckoning',
      anchorDate: { year: '0' },
      beforeLabel: 'Before Cataclysm',
      beforeAbbreviation: 'BC',
      afterLabel: 'After Cataclysm',
      afterAbbreviation: 'AC',
    })
    expect(reckoning.id).toBe(reckoningId)

    await expect(
      service.createReckoning({
        actorUserId: memberId,
        worldId,
        name: 'Denied',
        anchorDate: { year: '0' },
        beforeLabel: 'Before',
        afterLabel: 'After',
      }),
    ).rejects.toMatchObject({
      code: 'WORLD_PERMISSION_DENIED',
    } satisfies Partial<WorldDomainError>)
  })

  it('keeps a reckoning while an event uses its notation', async () => {
    const { repository, service, useReckoningId } = createHarness()
    useReckoningId()
    await service.createReckoning({
      actorUserId: ownerId,
      worldId,
      name: 'Cataclysm Reckoning',
      anchorDate: { year: '0' },
      beforeLabel: 'Before Cataclysm',
      beforeAbbreviation: 'BC',
      afterLabel: 'After Cataclysm',
      afterAbbreviation: 'AC',
    })

    repository.events.push({
      id: eventId,
      timelineId,
      title: 'Aftermath',
      description: null,
      startWorldPosition: '100',
      endWorldPosition: null,
      startWorldDateLabel: '100 AC',
      endWorldDateLabel: null,
      startReckoningId: reckoningId,
      startReckoningDirection: 'AFTER',
      endReckoningId: null,
      endReckoningDirection: null,
      type: 'event',
      data: {},
      entityIds: [],
      createdAt: now,
      updatedAt: now,
    })

    await expect(
      service.deleteReckoning(worldId, ownerId, reckoningId),
    ).rejects.toMatchObject({
      code: 'WORLD_RECKONING_IN_USE',
    } satisfies Partial<WorldEventDomainError>)
  })
})
