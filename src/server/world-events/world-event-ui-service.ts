import { prisma } from '@/lib/prisma'
import { worldEntityService } from '../world-entities'
import { worldEventService } from './world-event-service'

export interface WorldTimelineEntityChoice {
  id: string
  name: string
  type: string
}

export interface WorldTimelineEventView {
  id: string
  title: string
  description: string | null
  startWorldPosition: string
  endWorldPosition: string | null
  startWorldDateLabel: string
  endWorldDateLabel: string | null
  startReckoningId: string | null
  startReckoningDirection: 'BEFORE' | 'AFTER' | null
  endReckoningId: string | null
  endReckoningDirection: 'BEFORE' | 'AFTER' | null
  linkedEntities: WorldTimelineEntityChoice[]
}

export async function getWorldTimelineWorkspace(
  worldId: string,
  userId: string,
) {
  const timelineState = await worldEventService.loadMainTimeline(
    worldId,
    userId,
  )
  const [world, visibleEntities] = await Promise.all([
    prisma.world.findUnique({
      where: { id: worldId },
      select: { id: true, name: true },
    }),
    worldEntityService.listEntities(worldId, userId),
  ])
  if (!world) return null

  const entityChoices: WorldTimelineEntityChoice[] = visibleEntities.map(
    (entity) => ({ id: entity.id, name: entity.name, type: entity.type }),
  )
  const entitiesById = new Map(
    entityChoices.map((entity) => [entity.id, entity]),
  )

  const events: WorldTimelineEventView[] = timelineState.events.map(
    (event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startWorldPosition: event.startWorldPosition,
      endWorldPosition: event.endWorldPosition,
      startWorldDateLabel: event.startWorldDateLabel,
      endWorldDateLabel: event.endWorldDateLabel,
      startReckoningId: event.startReckoningId,
      startReckoningDirection: event.startReckoningDirection,
      endReckoningId: event.endReckoningId,
      endReckoningDirection: event.endReckoningDirection,
      linkedEntities: event.entityIds
        .map((entityId) => entitiesById.get(entityId))
        .filter((entity): entity is WorldTimelineEntityChoice =>
          Boolean(entity),
        ),
    }),
  )

  return {
    world,
    timeline: timelineState.timeline,
    events,
    reckonings: timelineState.reckonings,
    entityChoices,
    canEditEvents: timelineState.canEditEvents,
    canManageChronology: timelineState.canManageChronology,
  }
}
