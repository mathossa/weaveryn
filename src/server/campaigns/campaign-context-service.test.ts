import { beforeEach, describe, expect, it } from 'vitest'
import type { WorldEntityRecord } from '@/server/world-entities'
import {
  CampaignContextService,
  type CampaignContextAccess,
  type CampaignContextEntityGateway,
  type CampaignContextRecord,
  type CampaignContextRepository,
} from './campaign-context-service'

const CAMPAIGN_ID = 'campaign-1'
const WORLD_ID = 'world-1'
const LOCATION_ID = 'location-1'

function entity(input: Partial<WorldEntityRecord> = {}): WorldEntityRecord {
  return {
    id: LOCATION_ID,
    worldId: WORLD_ID,
    type: 'location',
    name: 'Emberwatch',
    description: null,
    image: null,
    data: {},
    visibilityScope: 'CAMPAIGN',
    visibilityCampaignId: CAMPAIGN_ID,
    visibilityUserId: null,
    createdById: 'owner',
    createdAt: new Date('2026-08-23T00:00:00.000Z'),
    updatedAt: new Date('2026-08-23T00:00:00.000Z'),
    ...input,
  }
}

class ContextRepository implements CampaignContextRepository {
  access: CampaignContextAccess | null = {
    id: CAMPAIGN_ID,
    worldId: WORLD_ID,
    ownerId: 'owner',
    status: 'ACTIVE',
    role: 'PLAYER',
    capabilities: [],
  }
  updated: CampaignContextRecord = {
    id: CAMPAIGN_ID,
    currentLocationId: null,
    currentFocus: null,
    updatedAt: new Date('2026-08-23T00:00:00.000Z'),
  }
  lastRequiresManager: boolean | null = null

  findAccess() {
    return Promise.resolve(this.access)
  }

  updateAuthorized(
    _campaignId: string,
    _worldId: string,
    _userId: string,
    input: { currentLocationId?: string | null; currentFocus?: string | null },
    requiresManager: boolean,
  ) {
    this.lastRequiresManager = requiresManager
    this.updated = { ...this.updated, ...input }
    return Promise.resolve(this.updated)
  }
}

class EntityGateway implements CampaignContextEntityGateway {
  visibleEntity: WorldEntityRecord | null = entity()

  loadEntity() {
    return Promise.resolve(this.visibleEntity)
  }
}

describe('CampaignContextService', () => {
  let repository: ContextRepository
  let entities: EntityGateway
  let service: CampaignContextService

  beforeEach(() => {
    repository = new ContextRepository()
    entities = new EntityGateway()
    service = new CampaignContextService(repository, entities)
  })

  it('allows a capable Threadwalker to update only Current Location', async () => {
    repository.access = {
      ...repository.access!,
      capabilities: ['UPDATE_CURRENT_LOCATION'],
    }
    await expect(
      service.update(CAMPAIGN_ID, 'player', {
        currentLocationId: LOCATION_ID,
      }),
    ).resolves.toMatchObject({ currentLocationId: LOCATION_ID })
    expect(repository.lastRequiresManager).toBe(false)

    await expect(
      service.update(CAMPAIGN_ID, 'player', { currentFocus: 'Go north.' }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_UPDATE_FORBIDDEN' })
  })

  it('allows existing Campaign managers to update location and focus', async () => {
    repository.access = { ...repository.access!, role: 'ASSISTANT_GM' }
    await expect(
      service.update(CAMPAIGN_ID, 'assistant', {
        currentLocationId: LOCATION_ID,
        currentFocus: 'Reach the gate before dusk.',
      }),
    ).resolves.toMatchObject({
      currentLocationId: LOCATION_ID,
      currentFocus: 'Reach the gate before dusk.',
    })
    expect(repository.lastRequiresManager).toBe(true)
  })

  it('rejects inaccessible, cross-world, and non-location entities uniformly', async () => {
    repository.access = { ...repository.access!, ownerId: 'owner' }
    entities.visibleEntity = null
    await expect(
      service.update(CAMPAIGN_ID, 'owner', {
        currentLocationId: 'hidden-or-cross-world',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_LOCATION_INVALID' })

    entities.visibleEntity = entity({ type: 'person' })
    await expect(
      service.update(CAMPAIGN_ID, 'owner', {
        currentLocationId: LOCATION_ID,
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_LOCATION_INVALID' })
  })

  it('fails closed for outsiders and archived Campaigns', async () => {
    repository.access = null
    await expect(
      service.update(CAMPAIGN_ID, 'outsider', { currentLocationId: null }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_UPDATE_FORBIDDEN' })

    repository.access = {
      id: CAMPAIGN_ID,
      worldId: WORLD_ID,
      ownerId: 'owner',
      status: 'ARCHIVED',
      role: 'GM',
      capabilities: [],
    }
    await expect(
      service.update(CAMPAIGN_ID, 'owner', { currentFocus: null }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_UPDATE_FORBIDDEN' })
  })
})
