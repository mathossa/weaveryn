import { describe, expect, it } from 'vitest'
import { WorldDomainError } from '../worlds/world-errors'
import type { WorldRole } from '../worlds/world-role'
import { CampaignDomainError } from './campaign-errors'
import type {
  CampaignRecord,
  CampaignRepository,
  CreateCampaignRecordInput,
  UpdateCampaignRecordInput,
} from './campaign-repository'
import type {
  CampaignMembershipRecord,
  CreateCampaignMembershipInput,
} from './campaign-membership-repository'
import { CampaignService } from './campaign-service'

const worldId = '00000000-0000-4000-8000-000000000001'
const timelineId = '00000000-0000-4000-8000-000000000002'
const ownerId = '00000000-0000-4000-8000-00000000000a'
const adminId = '00000000-0000-4000-8000-00000000000b'
const memberId = '00000000-0000-4000-8000-00000000000c'
const outsiderId = '00000000-0000-4000-8000-00000000000d'
const campaignMemberId = '00000000-0000-4000-8000-00000000000e'
const campaignId = '00000000-0000-4000-8000-000000000010'
const now = new Date('2026-08-15T00:00:00.000Z')

class InMemoryCampaignRepository implements CampaignRepository {
  world = { id: worldId, ownerId }
  memberships = new Map<string, WorldRole>([
    [adminId, 'ADMIN'],
    [memberId, 'MEMBER'],
  ])
  timeline: { id: string; worldId: string } | null = {
    id: timelineId,
    worldId,
  }
  campaigns: CampaignRecord[] = []
  campaignMemberships: CampaignMembershipRecord[] = []

  runInTransaction<T>(
    operation: (repository: CampaignRepository) => Promise<T>,
  ): Promise<T> {
    return operation(this)
  }

  async findWorldById(requestedWorldId: string) {
    return requestedWorldId === this.world.id ? this.world : null
  }

  async findMembership(requestedWorldId: string, userId: string) {
    const role =
      requestedWorldId === this.world.id
        ? this.memberships.get(userId)
        : undefined

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

  async findMainTimelineByWorldId(requestedWorldId: string) {
    return this.timeline?.worldId === requestedWorldId ? this.timeline : null
  }

  async createCampaign(input: CreateCampaignRecordInput) {
    const campaign: CampaignRecord = {
      ...input,
      description: input.description ?? null,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    }
    this.campaigns.push(campaign)
    return campaign
  }

  async createCampaignMembership(input: CreateCampaignMembershipInput) {
    const membership: CampaignMembershipRecord = {
      id: `${input.campaignId}:${input.userId}`,
      ...input,
      joinedAt: now,
      updatedAt: now,
    }
    this.campaignMemberships.push(membership)
    return membership
  }

  async findCampaignForUser(requestedCampaignId: string, userId: string) {
    return (
      this.campaigns.find(
        (campaign) =>
          campaign.id === requestedCampaignId &&
          (campaign.ownerId === userId ||
            this.campaignMemberships.some(
              (membership) =>
                membership.campaignId === requestedCampaignId &&
                membership.userId === userId,
            )),
      ) ?? null
    )
  }

  async listCampaignsForUser(userId: string) {
    return this.campaigns.filter(
      (campaign) =>
        campaign.ownerId === userId ||
        this.campaignMemberships.some(
          (membership) =>
            membership.campaignId === campaign.id &&
            membership.userId === userId,
        ),
    )
  }

  async updateOwnedCampaign(
    requestedCampaignId: string,
    requestedOwnerId: string,
    input: UpdateCampaignRecordInput,
  ) {
    const campaign = this.campaigns.find(
      (candidate) =>
        candidate.id === requestedCampaignId &&
        candidate.ownerId === requestedOwnerId &&
        candidate.status !== 'ARCHIVED',
    )

    if (!campaign) return null

    Object.assign(campaign, input, { updatedAt: now })
    return campaign
  }
}

function createHarness() {
  const repository = new InMemoryCampaignRepository()
  const service = new CampaignService(repository, () => campaignId)
  return { repository, service }
}

function createInput(creatorId: string) {
  return {
    creatorId,
    worldId,
    name: 'Ashes of Aldorath',
    description: 'A campaign at the edge of an empire.',
    currentWorldPosition: '142.5',
    currentWorldDateLabel: '14 Emberwane, 812',
  }
}

describe('CampaignService', () => {
  it('creates an active Campaign with a GM membership for its owner', async () => {
    const { repository, service } = createHarness()

    const campaign = await service.createCampaign(createInput(ownerId))

    expect(campaign).toMatchObject({
      id: campaignId,
      worldId,
      ownerId,
      timelineId,
      currentWorldPosition: '142.5',
      currentWorldDateLabel: '14 Emberwane, 812',
      status: 'ACTIVE',
    })
    expect(repository.campaigns).toHaveLength(1)
    expect(repository.campaignMemberships).toEqual([
      expect.objectContaining({ campaignId, userId: ownerId, role: 'GM' }),
    ])
  })

  it('allows a World ADMIN to create and independently own a Campaign', async () => {
    const { service } = createHarness()

    const campaign = await service.createCampaign(createInput(adminId))

    expect(campaign.ownerId).toBe(adminId)
    expect(campaign.ownerId).not.toBe(ownerId)
    expect(campaign.worldId).toBe(worldId)
  })

  it.each([
    ['MEMBER', memberId],
    ['non-member', outsiderId],
  ])('rejects Campaign creation by a %s', async (_, creatorId) => {
    const { repository, service } = createHarness()

    await expect(
      service.createCampaign(createInput(creatorId)),
    ).rejects.toMatchObject({
      code: 'WORLD_PERMISSION_DENIED',
    } satisfies Partial<WorldDomainError>)
    expect(repository.campaigns).toHaveLength(0)
  })

  it('fails closed when the World has no main timeline', async () => {
    const { repository, service } = createHarness()
    repository.timeline = null

    await expect(
      service.createCampaign(createInput(ownerId)),
    ).rejects.toMatchObject({
      code: 'CAMPAIGN_MAIN_TIMELINE_NOT_FOUND',
    } satisfies Partial<CampaignDomainError>)
    expect(repository.campaigns).toHaveLength(0)
  })

  it('loads and lists Campaigns for their owner', async () => {
    const { service } = createHarness()
    const campaign = await service.createCampaign(createInput(adminId))

    await expect(service.loadCampaign(campaign.id, adminId)).resolves.toBe(
      campaign,
    )
    await expect(service.listCampaigns(adminId)).resolves.toEqual([campaign])
    await expect(service.loadCampaign(campaign.id, ownerId)).resolves.toBeNull()
    await expect(service.listCampaigns(ownerId)).resolves.toEqual([])
  })

  it('loads and lists Campaigns for a Campaign member without making them an owner', async () => {
    const { repository, service } = createHarness()
    const campaign = await service.createCampaign(createInput(adminId))
    await repository.createCampaignMembership({
      campaignId: campaign.id,
      userId: campaignMemberId,
      role: 'SPECTATOR',
    })

    await expect(
      service.loadCampaign(campaign.id, campaignMemberId),
    ).resolves.toBe(campaign)
    await expect(service.listCampaigns(campaignMemberId)).resolves.toEqual([
      campaign,
    ])
    expect(campaign.ownerId).toBe(adminId)
  })

  it('allows the Campaign owner to update only basic and temporal fields', async () => {
    const { service } = createHarness()
    const campaign = await service.createCampaign(createInput(adminId))

    const updated = await service.updateCampaign(campaign.id, adminId, {
      name: 'Ashes of Aldorath: Aftermath',
      currentWorldPosition: '148',
      currentWorldDateLabel: '20 Emberwane, 812',
      ownerId,
      worldId: outsiderId,
      status: 'ARCHIVED',
    } as Parameters<typeof service.updateCampaign>[2] & {
      ownerId: string
      worldId: string
      status: string
    })

    expect(updated).toMatchObject({
      name: 'Ashes of Aldorath: Aftermath',
      currentWorldPosition: '148',
      currentWorldDateLabel: '20 Emberwane, 812',
      ownerId: adminId,
      worldId,
      timelineId,
      status: 'ACTIVE',
    })
  })

  it('rejects non-owner and archived Campaign updates', async () => {
    const { service } = createHarness()
    const campaign = await service.createCampaign(createInput(adminId))

    await expect(
      service.updateCampaign(campaign.id, ownerId, { name: 'Taken over' }),
    ).rejects.toMatchObject({
      code: 'CAMPAIGN_UPDATE_FORBIDDEN',
    } satisfies Partial<CampaignDomainError>)

    campaign.status = 'ARCHIVED'

    await expect(
      service.updateCampaign(campaign.id, adminId, { name: 'Reopened' }),
    ).rejects.toMatchObject({
      code: 'CAMPAIGN_UPDATE_FORBIDDEN',
    } satisfies Partial<CampaignDomainError>)
  })
})
