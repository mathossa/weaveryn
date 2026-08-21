import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import type { WorldMembershipRecord } from '../worlds/world-membership-repository'
import { MAIN_WORLD_TIMELINE_NAME } from '../worlds/world-timelines'
import type {
  CreateWorldEventRecordInput,
  CreateWorldReckoningRecordInput,
  UpdateWorldEventRecordInput,
  WorldEventRecord,
  WorldEventRepository,
  WorldReckoningRecord,
} from './world-event-repository'

type Db = PrismaClient | Prisma.TransactionClient

const eventInclude = {
  entities: { select: { worldEntityId: true } },
} satisfies Prisma.WorldEventInclude

type WorldEventWithEntities = Prisma.WorldEventGetPayload<{
  include: typeof eventInclude
}>

function toEvent(value: WorldEventWithEntities): WorldEventRecord {
  return {
    id: value.id,
    timelineId: value.timelineId,
    title: value.title,
    description: value.description,
    startWorldPosition: value.startWorldPosition.toString(),
    endWorldPosition: value.endWorldPosition?.toString() ?? null,
    startWorldDateLabel: value.startWorldDateLabel,
    endWorldDateLabel: value.endWorldDateLabel,
    startReckoningId: value.startReckoningId,
    startReckoningDirection: value.startReckoningDirection,
    endReckoningId: value.endReckoningId,
    endReckoningDirection: value.endReckoningDirection,
    type: value.type,
    data: value.data,
    entityIds: value.entities.map((link) => link.worldEntityId),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function toReckoning(value: {
  id: string
  worldId: string
  name: string
  anchorWorldPosition: { toString(): string }
  anchorWorldDateLabel: string
  beforeLabel: string
  beforeAbbreviation: string | null
  afterLabel: string
  afterAbbreviation: string | null
  createdAt: Date
  updatedAt: Date
}): WorldReckoningRecord {
  return {
    ...value,
    anchorWorldPosition: value.anchorWorldPosition.toString(),
  }
}

export class PrismaWorldEventRepository implements WorldEventRepository {
  constructor(
    private readonly root: PrismaClient,
    private readonly db: Db = root,
  ) {}

  runInTransaction<T>(
    operation: (repository: WorldEventRepository) => Promise<T>,
  ): Promise<T> {
    return this.root.$transaction((transaction) =>
      operation(new PrismaWorldEventRepository(this.root, transaction)),
    )
  }

  findWorldById(worldId: string) {
    return this.db.world.findUnique({
      where: { id: worldId },
      select: { id: true, ownerId: true },
    })
  }

  findMembership(
    worldId: string,
    userId: string,
  ): Promise<WorldMembershipRecord | null> {
    return this.db.worldMembership.findUnique({
      where: { worldId_userId: { worldId, userId } },
    })
  }

  findMainTimeline(worldId: string) {
    return this.db.worldTimeline.findFirst({
      where: { worldId, name: MAIN_WORLD_TIMELINE_NAME },
      select: { id: true, worldId: true, name: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  async createEvent(input: CreateWorldEventRecordInput) {
    return toEvent(
      await this.db.worldEvent.create({
        data: {
          ...input,
          description: input.description ?? null,
          endWorldPosition: input.endWorldPosition ?? null,
          endWorldDateLabel: input.endWorldDateLabel ?? null,
          startReckoningId: input.startReckoningId ?? null,
          startReckoningDirection: input.startReckoningDirection ?? null,
          endReckoningId: input.endReckoningId ?? null,
          endReckoningDirection: input.endReckoningDirection ?? null,
          data: input.data as Prisma.InputJsonValue,
        },
        include: eventInclude,
      }),
    )
  }

  findEvent(worldId: string, eventId: string) {
    return this.db.worldEvent
      .findFirst({
        where: { id: eventId, timeline: { worldId } },
        include: eventInclude,
      })
      .then((value) => (value ? toEvent(value) : null))
  }

  async listEvents(timelineId: string) {
    return (
      await this.db.worldEvent.findMany({
        where: { timelineId },
        include: eventInclude,
        orderBy: [
          { startWorldPosition: 'asc' },
          { endWorldPosition: 'asc' },
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
      })
    ).map(toEvent)
  }

  async updateEvent(
    worldId: string,
    eventId: string,
    input: UpdateWorldEventRecordInput,
  ) {
    const result = await this.db.worldEvent.updateMany({
      where: { id: eventId, timeline: { worldId } },
      data: input,
    })
    if (result.count !== 1) return null

    return toEvent(
      await this.db.worldEvent.findUniqueOrThrow({
        where: { id: eventId },
        include: eventInclude,
      }),
    )
  }

  async deleteEvent(worldId: string, eventId: string) {
    const result = await this.db.worldEvent.deleteMany({
      where: { id: eventId, timeline: { worldId } },
    })
    return result.count === 1
  }

  async replaceEventEntities(eventId: string, entityIds: string[]) {
    await this.db.worldEventEntity.deleteMany({ where: { worldEventId: eventId } })
    if (entityIds.length === 0) return
    await this.db.worldEventEntity.createMany({
      data: entityIds.map((worldEntityId) => ({
        worldEventId: eventId,
        worldEntityId,
      })),
      skipDuplicates: true,
    })
  }

  async listReckonings(worldId: string) {
    return (
      await this.db.worldReckoning.findMany({
        where: { worldId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      })
    ).map(toReckoning)
  }

  findReckoning(worldId: string, reckoningId: string) {
    return this.db.worldReckoning
      .findFirst({ where: { id: reckoningId, worldId } })
      .then((value) => (value ? toReckoning(value) : null))
  }

  async createReckoning(input: CreateWorldReckoningRecordInput) {
    return toReckoning(
      await this.db.worldReckoning.create({
        data: {
          ...input,
          beforeAbbreviation: input.beforeAbbreviation ?? null,
          afterAbbreviation: input.afterAbbreviation ?? null,
        },
      }),
    )
  }

  countReckoningUses(worldId: string, reckoningId: string) {
    return this.db.worldEvent.count({
      where: {
        timeline: { worldId },
        OR: [{ startReckoningId: reckoningId }, { endReckoningId: reckoningId }],
      },
    })
  }

  async deleteReckoning(worldId: string, reckoningId: string) {
    const result = await this.db.worldReckoning.deleteMany({
      where: { id: reckoningId, worldId },
    })
    return result.count === 1
  }
}
