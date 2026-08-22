import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { worldNotFound, worldPermissionDenied } from '../worlds/world-errors'
import {
  WORLD_PERMISSIONS,
  WorldAuthorizationService,
} from '../worlds/world-permissions'
import {
  entityRelationshipCrossWorld,
  entityRelationshipNotFound,
  worldEntityCharacterManaged,
  worldEntityCharacterTypeReserved,
  worldEntityNotFound,
  worldEntityTypeScopeInvalid,
  worldEntityVisibilityInvalid,
} from './world-entity-errors'
import type {
  CampaignVisibilityAccessRecord,
  CreateEntityRelationshipRecordInput,
  StructuredData,
  UpdateWorldEntityRecordInput,
  VisibilityRecord,
  VisibilityScope,
  WorldEntityRecord,
  WorldEntityRepository,
  WorldEntityTypeRecord,
} from './world-entity-repository'
import { PrismaWorldEntityRepository } from './prisma-world-entity-repository'

export const BUILT_IN_WORLD_ENTITY_TYPES = [
  { value: 'character', label: 'Character' },
  { value: 'person', label: 'Person / NPC' },
  { value: 'location', label: 'Location' },
  { value: 'organization', label: 'Faction / Organization' },
  { value: 'item', label: 'Item' },
  { value: 'event', label: 'Event' },
  { value: 'deity', label: 'Deity' },
  { value: 'creature', label: 'Creature' },
  { value: 'quest', label: 'Quest / story object' },
] as const

export interface EntityVisibilityInput {
  scope?: VisibilityScope
  campaignId?: string | null
  userId?: string | null
}

export interface InitialEntityRelationshipInput {
  targetEntityId: string
  relationshipType: string
  label?: string | null
}

export interface CreateWorldEntityInput {
  actorUserId: string
  worldId: string
  type: string
  name: string
  description?: string | null
  image?: string | null
  imageFocusX?: number
  imageFocusY?: number
  data?: StructuredData
  contextCampaignId?: string
  visibility?: EntityVisibilityInput
  initialRelationships?: InitialEntityRelationshipInput[]
}

export interface UpdateWorldEntityInput {
  type?: string
  name?: string
  description?: string | null
  image?: string | null
  imageFocusX?: number
  imageFocusY?: number
  data?: StructuredData
  contextCampaignId?: string
  visibility?: EntityVisibilityInput
}

export interface CreateEntityRelationshipInput {
  actorUserId: string
  worldId: string
  sourceEntityId: string
  targetEntityId: string
  relationshipType: string
  label?: string | null
  metadata?: StructuredData
  contextCampaignId?: string
  visibility?: EntityVisibilityInput
}

export interface WorldEntityTypeChoice {
  id?: string
  value: string
  label: string
  scope: 'BUILT_IN' | 'WORLD' | 'CAMPAIGN'
  usageCount?: number
}

export type WorldEntityIdFactory = () => string

interface VisibilityContext {
  worldId: string
  userId: string
  isWorldOwner: boolean
  hasWorldMembership: boolean
  campaigns: Map<string, CampaignVisibilityAccessRecord>
}

interface ResolvedVisibility {
  visibilityScope: VisibilityScope
  visibilityCampaignId: string | null
  visibilityUserId: string | null
}

interface PreparedRelationshipContext {
  visibility?: ResolvedVisibility
  visibilityContext?: VisibilityContext
  source?: WorldEntityRecord
  campaignContextValidated?: boolean
}

function normalizeTypeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

function isCharacterType(value: string) {
  const normalized = normalizeTypeName(value)
  return normalized === 'character'
}

function isBuiltInType(value: string) {
  const normalized = normalizeTypeName(value)
  return BUILT_IN_WORLD_ENTITY_TYPES.some(
    (choice) =>
      normalizeTypeName(choice.value) === normalized ||
      normalizeTypeName(choice.label) === normalized,
  )
}

function canViewRecord(record: VisibilityRecord, context: VisibilityContext) {
  if ('worldCharacterId' in record && record.worldCharacterId) {
    const entity = record as WorldEntityRecord
    return (
      context.isWorldOwner ||
      context.hasWorldMembership ||
      (entity.worldCharacterCampaignIds ?? []).some((campaignId) =>
        context.campaigns.has(campaignId),
      )
    )
  }

  switch (record.visibilityScope) {
    case 'WORLD':
      return context.isWorldOwner || context.hasWorldMembership
    case 'CAMPAIGN':
      return Boolean(
        record.visibilityCampaignId &&
        context.campaigns.has(record.visibilityCampaignId),
      )
    case 'GM': {
      if (!record.visibilityCampaignId) return false
      const access = context.campaigns.get(record.visibilityCampaignId)
      return Boolean(
        access &&
          (access.ownerId === context.userId ||
            access.membershipRole === 'GM' ||
            access.membershipRole === 'ASSISTANT_GM'),
      )
    }
    case 'PLAYER':
      return (
        record.visibilityUserId === context.userId &&
        (!record.visibilityCampaignId ||
          context.campaigns.has(record.visibilityCampaignId))
      )
    case 'PRIVATE':
      return record.createdById === context.userId
  }
}

function pickEntityUpdates(
  input: UpdateWorldEntityInput,
): UpdateWorldEntityRecordInput {
  return {
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.image !== undefined ? { image: input.image } : {}),
    ...(input.imageFocusX !== undefined
      ? { imageFocusX: input.imageFocusX }
      : {}),
    ...(input.imageFocusY !== undefined
      ? { imageFocusY: input.imageFocusY }
      : {}),
    ...(input.data !== undefined ? { data: input.data } : {}),
  }
}

export class WorldEntityService {
  constructor(
    private readonly repository: WorldEntityRepository,
    private readonly createId: WorldEntityIdFactory = randomUUID,
  ) {}

  private async getVisibilityContext(
    repository: WorldEntityRepository,
    worldId: string,
    userId: string,
  ): Promise<VisibilityContext> {
    const world = await repository.findWorldById(worldId)
    if (!world) throw worldNotFound(worldId)

    const isWorldOwner = world.ownerId === userId
    const membership = isWorldOwner
      ? null
      : await repository.findMembership(worldId, userId)
    const campaignAccesses = await repository.listCampaignAccesses(
      worldId,
      userId,
    )

    if (!isWorldOwner && !membership && campaignAccesses.length === 0) {
      throw worldPermissionDenied(worldId, userId)
    }

    return {
      worldId,
      userId,
      isWorldOwner,
      hasWorldMembership: Boolean(membership),
      campaigns: new Map(campaignAccesses.map((access) => [access.id, access])),
    }
  }

  private async assertCampaignContext(
    repository: WorldEntityRepository,
    worldId: string,
    userId: string,
    campaignId: string,
  ) {
    const campaign = await repository.findAccessibleCampaign(campaignId, userId)
    if (!campaign || campaign.worldId !== worldId) {
      throw worldEntityTypeScopeInvalid(
        'Campaign-scoped entity types must use an accessible Campaign in the same World.',
      )
    }
    return campaign
  }

  private async resolveVisibility(
    repository: WorldEntityRepository,
    input: {
      worldId: string
      actorUserId: string
      contextCampaignId?: string
      visibility?: EntityVisibilityInput
    },
  ): Promise<ResolvedVisibility> {
    const scope =
      input.visibility?.scope ??
      (input.contextCampaignId ? 'CAMPAIGN' : 'WORLD')
    const campaignId =
      input.visibility?.campaignId ??
      (scope === 'CAMPAIGN' || scope === 'GM'
        ? (input.contextCampaignId ?? null)
        : null)
    const userId = input.visibility?.userId ?? null

    if (scope === 'WORLD' || scope === 'PRIVATE') {
      if (campaignId || userId) {
        throw worldEntityVisibilityInvalid(
          `${scope} visibility does not accept Campaign or User targets.`,
        )
      }
      return {
        visibilityScope: scope,
        visibilityCampaignId: null,
        visibilityUserId: null,
      }
    }

    if (scope === 'CAMPAIGN' || scope === 'GM') {
      if (!campaignId || userId) {
        throw worldEntityVisibilityInvalid(
          `${scope} visibility requires exactly one Campaign target.`,
        )
      }
      const campaign = await repository.findAccessibleCampaign(
        campaignId,
        input.actorUserId,
      )
      if (!campaign || campaign.worldId !== input.worldId) {
        throw worldEntityVisibilityInvalid(
          'Visibility Campaign must be accessible to the actor and belong to the same World.',
        )
      }
      return {
        visibilityScope: scope,
        visibilityCampaignId: campaignId,
        visibilityUserId: null,
      }
    }

    if (!userId) {
      throw worldEntityVisibilityInvalid(
        'PLAYER visibility requires a target User.',
      )
    }
    if (!(await repository.userExists(userId))) {
      throw worldEntityVisibilityInvalid(
        'PLAYER visibility target User does not exist.',
      )
    }
    if (campaignId) {
      const campaign = await repository.findAccessibleCampaign(
        campaignId,
        input.actorUserId,
      )
      if (!campaign || campaign.worldId !== input.worldId) {
        throw worldEntityVisibilityInvalid(
          'PLAYER visibility Campaign must be accessible to the actor and belong to the same World.',
        )
      }
    }
    return {
      visibilityScope: 'PLAYER',
      visibilityCampaignId: campaignId,
      visibilityUserId: userId,
    }
  }

  private async registerCustomType(
    repository: WorldEntityRepository,
    input: {
      actorUserId: string
      worldId: string
      type: string
      contextCampaignId?: string
    },
  ) {
    if (isBuiltInType(input.type)) return

    let campaignId: string | null = null
    let scopeKey = 'WORLD'
    if (input.contextCampaignId) {
      await this.assertCampaignContext(
        repository,
        input.worldId,
        input.actorUserId,
        input.contextCampaignId,
      )
      campaignId = input.contextCampaignId
      scopeKey = input.contextCampaignId
    }

    await repository.upsertWorldEntityType({
      id: this.createId(),
      worldId: input.worldId,
      campaignId,
      scopeKey,
      name: input.type.trim(),
      normalizedName: normalizeTypeName(input.type),
      createdById: input.actorUserId,
    })
  }

  private async createRelationshipRecord(
    repository: WorldEntityRepository,
    input: CreateEntityRelationshipInput,
    prepared?: PreparedRelationshipContext,
  ) {
    if (input.contextCampaignId && !prepared?.campaignContextValidated) {
      await this.assertCampaignContext(
        repository,
        input.worldId,
        input.actorUserId,
        input.contextCampaignId,
      )
    }
    const context =
      prepared?.visibilityContext ??
      (await this.getVisibilityContext(
        repository,
        input.worldId,
        input.actorUserId,
      ))
    const source =
      prepared?.source ?? (await repository.findEntityById(input.sourceEntityId))
    const target = await repository.findEntityById(input.targetEntityId)

    if (!source) throw worldEntityNotFound(input.sourceEntityId)
    if (!target) throw worldEntityNotFound(input.targetEntityId)
    if (source.worldId !== input.worldId || target.worldId !== input.worldId) {
      throw entityRelationshipCrossWorld()
    }
    if (!canViewRecord(source, context)) {
      throw worldEntityNotFound(input.sourceEntityId)
    }
    if (!canViewRecord(target, context)) {
      throw worldEntityNotFound(input.targetEntityId)
    }

    const visibility =
      prepared?.visibility ?? (await this.resolveVisibility(repository, input))
    const relationship: CreateEntityRelationshipRecordInput = {
      id: this.createId(),
      worldId: input.worldId,
      sourceEntityId: input.sourceEntityId,
      targetEntityId: input.targetEntityId,
      relationshipType: input.relationshipType.trim(),
      label: input.label,
      metadata: input.metadata ?? {},
      createdById: input.actorUserId,
      ...visibility,
    }
    return repository.createRelationship(relationship)
  }

  private buildEntityTypeChoices(
    custom: WorldEntityTypeRecord[],
    entities: WorldEntityRecord[],
  ): WorldEntityTypeChoice[] {
    const builtIn: WorldEntityTypeChoice[] = BUILT_IN_WORLD_ENTITY_TYPES.map(
      (choice) => ({ ...choice, scope: 'BUILT_IN' }),
    )
    const seen = new Set(
      builtIn.map((choice) => normalizeTypeName(choice.value)),
    )
    const customChoices = custom
      .filter((choice) => !seen.has(choice.normalizedName))
      .map((choice) => ({
        id: choice.id,
        value: choice.name,
        label: choice.name,
        scope: choice.campaignId ? ('CAMPAIGN' as const) : ('WORLD' as const),
        usageCount: entities.filter(
          (entity) => normalizeTypeName(entity.type) === choice.normalizedName,
        ).length,
      }))
    return [...builtIn, ...customChoices]
  }

  createEntity(input: CreateWorldEntityInput): Promise<WorldEntityRecord> {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        input.actorUserId,
        input.worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )

      if (isCharacterType(input.type)) throw worldEntityCharacterTypeReserved()

      if (input.contextCampaignId) {
        await this.assertCampaignContext(
          repository,
          input.worldId,
          input.actorUserId,
          input.contextCampaignId,
        )
      }
      const visibility = await this.resolveVisibility(repository, input)
      await this.registerCustomType(repository, input)

      const entity = await repository.createEntity({
        id: this.createId(),
        worldId: input.worldId,
        type: input.type.trim(),
        name: input.name,
        description: input.description,
        image: input.image,
        imageFocusX: input.imageFocusX ?? 50,
        imageFocusY: input.imageFocusY ?? 50,
        data: input.data ?? {},
        createdById: input.actorUserId,
        ...visibility,
      })

      const initialRelationships = input.initialRelationships ?? []
      const relationshipContext =
        initialRelationships.length > 0
          ? await this.getVisibilityContext(
              repository,
              input.worldId,
              input.actorUserId,
            )
          : undefined

      for (const relationship of initialRelationships) {
        await this.createRelationshipRecord(
          repository,
          {
            actorUserId: input.actorUserId,
            worldId: input.worldId,
            sourceEntityId: entity.id,
            targetEntityId: relationship.targetEntityId,
            relationshipType: relationship.relationshipType,
            label: relationship.label,
            contextCampaignId: input.contextCampaignId,
          },
          {
            visibility,
            visibilityContext: relationshipContext,
            source: entity,
            campaignContextValidated: Boolean(input.contextCampaignId),
          },
        )
      }

      return entity
    })
  }

  async loadEntity(
    worldId: string,
    userId: string,
    entityId: string,
  ): Promise<WorldEntityRecord | null> {
    const context = await this.getVisibilityContext(
      this.repository,
      worldId,
      userId,
    )
    const entity = await this.repository.findEntity(worldId, entityId)
    return entity && canViewRecord(entity, context) ? entity : null
  }

  async listEntities(worldId: string, userId: string) {
    const context = await this.getVisibilityContext(
      this.repository,
      worldId,
      userId,
    )
    const entities = await this.repository.listEntities(worldId)
    return entities.filter((entity) => canViewRecord(entity, context))
  }

  updateEntity(
    worldId: string,
    userId: string,
    entityId: string,
    input: UpdateWorldEntityInput,
  ) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        userId,
        worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )
      const context = await this.getVisibilityContext(
        repository,
        worldId,
        userId,
      )
      const current = await repository.findEntity(worldId, entityId)
      if (!current || !canViewRecord(current, context)) {
        throw worldEntityNotFound(entityId)
      }

      if (current.worldCharacterId) {
        if (
          input.type !== undefined ||
          input.name !== undefined ||
          input.image !== undefined ||
          input.visibility !== undefined
        ) {
          throw worldEntityCharacterManaged(entityId)
        }
      } else if (input.type !== undefined && isCharacterType(input.type)) {
        throw worldEntityCharacterTypeReserved()
      }

      if (input.contextCampaignId) {
        await this.assertCampaignContext(
          repository,
          worldId,
          userId,
          input.contextCampaignId,
        )
      }
      if (input.type !== undefined) {
        await this.registerCustomType(repository, {
          actorUserId: userId,
          worldId,
          type: input.type,
          contextCampaignId: input.contextCampaignId,
        })
      }

      const visibility = input.visibility
        ? await this.resolveVisibility(repository, {
            actorUserId: userId,
            worldId,
            contextCampaignId: input.contextCampaignId,
            visibility: input.visibility,
          })
        : null
      const updated = await repository.updateEntity(worldId, entityId, {
        ...pickEntityUpdates(input),
        ...(visibility ?? {}),
      })
      if (!updated) throw worldEntityNotFound(entityId)
      return updated
    })
  }

  deleteEntity(worldId: string, userId: string, entityId: string) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        userId,
        worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )
      const context = await this.getVisibilityContext(
        repository,
        worldId,
        userId,
      )
      const current = await repository.findEntity(worldId, entityId)
      if (!current || !canViewRecord(current, context)) {
        throw worldEntityNotFound(entityId)
      }
      if (current.worldCharacterId) {
        throw worldEntityCharacterManaged(entityId)
      }
      if (!(await repository.deleteEntity(worldId, entityId))) {
        throw worldEntityNotFound(entityId)
      }
    })
  }

  createRelationship(input: CreateEntityRelationshipInput) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        input.actorUserId,
        input.worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )
      return this.createRelationshipRecord(repository, input)
    })
  }

  async listRelationships(worldId: string, userId: string) {
    const context = await this.getVisibilityContext(
      this.repository,
      worldId,
      userId,
    )
    const [relationships, entities] = await Promise.all([
      this.repository.listRelationships(worldId),
      this.repository.listEntities(worldId),
    ])
    const visibleEntityIds = new Set(
      entities
        .filter((entity) => canViewRecord(entity, context))
        .map((entity) => entity.id),
    )
    return relationships.filter(
      (relationship) =>
        canViewRecord(relationship, context) &&
        visibleEntityIds.has(relationship.sourceEntityId) &&
        visibleEntityIds.has(relationship.targetEntityId),
    )
  }

  async readWorkspace(
    worldId: string,
    userId: string,
    contextCampaignId?: string,
  ) {
    const context = await this.getVisibilityContext(
      this.repository,
      worldId,
      userId,
    )
    if (contextCampaignId) {
      await this.assertCampaignContext(
        this.repository,
        worldId,
        userId,
        contextCampaignId,
      )
    }

    const [entities, relationships, customTypes] = await Promise.all([
      this.repository.listEntities(worldId),
      this.repository.listRelationships(worldId),
      this.repository.listWorldEntityTypes(worldId, contextCampaignId),
    ])
    const visibleEntities = entities.filter((entity) =>
      canViewRecord(entity, context),
    )
    const visibleEntityIds = new Set(visibleEntities.map((entity) => entity.id))
    const visibleRelationships = relationships.filter(
      (relationship) =>
        canViewRecord(relationship, context) &&
        visibleEntityIds.has(relationship.sourceEntityId) &&
        visibleEntityIds.has(relationship.targetEntityId),
    )

    return {
      entities: visibleEntities,
      relationships: visibleRelationships,
      entityTypes: this.buildEntityTypeChoices(customTypes, entities),
    }
  }

  deleteRelationship(worldId: string, userId: string, relationshipId: string) {
    return this.repository.runInTransaction(async (repository) => {
      const authorization = new WorldAuthorizationService(repository)
      await authorization.assertPermission(
        userId,
        worldId,
        WORLD_PERMISSIONS.EDIT_CONTENT,
      )
      const context = await this.getVisibilityContext(
        repository,
        worldId,
        userId,
      )
      const relationship = await repository.findRelationship(
        worldId,
        relationshipId,
      )
      if (!relationship || !canViewRecord(relationship, context)) {
        throw entityRelationshipNotFound(relationshipId)
      }
      const [source, target] = await Promise.all([
        repository.findEntity(worldId, relationship.sourceEntityId),
        repository.findEntity(worldId, relationship.targetEntityId),
      ])
      if (
        !source ||
        !target ||
        !canViewRecord(source, context) ||
        !canViewRecord(target, context)
      ) {
        throw entityRelationshipNotFound(relationshipId)
      }
      if (!(await repository.deleteRelationship(worldId, relationshipId))) {
        throw entityRelationshipNotFound(relationshipId)
      }
    })
  }

  async listEntityTypes(
    worldId: string,
    userId: string,
    contextCampaignId?: string,
  ): Promise<WorldEntityTypeChoice[]> {
    await this.getVisibilityContext(this.repository, worldId, userId)
    if (contextCampaignId) {
      await this.assertCampaignContext(
        this.repository,
        worldId,
        userId,
        contextCampaignId,
      )
    }
    const [custom, entities] = await Promise.all([
      this.repository.listWorldEntityTypes(worldId, contextCampaignId),
      this.repository.listEntities(worldId),
    ])
    return this.buildEntityTypeChoices(custom, entities)
  }
}

export const worldEntityService = new WorldEntityService(
  new PrismaWorldEntityRepository(prisma),
)
