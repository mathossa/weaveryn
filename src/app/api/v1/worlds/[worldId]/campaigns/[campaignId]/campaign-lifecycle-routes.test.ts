import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  transferOwnership: vi.fn(),
  endCampaign: vi.fn(),
  archiveCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
}))

vi.mock('@/server/auth', async (importActual) => ({
  ...(await importActual<typeof import('@/server/auth')>()),
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}))

vi.mock('@/server/campaigns', async (importActual) => ({
  ...(await importActual<typeof import('@/server/campaigns')>()),
  campaignService: {
    transferOwnership: mocks.transferOwnership,
    endCampaign: mocks.endCampaign,
    archiveCampaign: mocks.archiveCampaign,
    deleteCampaign: mocks.deleteCampaign,
  },
}))

import { unauthenticated } from '@/server/auth'
import { CampaignDomainError } from '@/server/campaigns'
import { DELETE } from './route'
import { POST as archiveCampaign } from './archive/route'
import { POST as endCampaign } from './end/route'
import { POST as transferOwnership } from './transfer/route'

const worldId = '21000000-0000-4000-8000-000000000001'
const campaignId = '21000000-0000-4000-8000-000000000002'
const ownerId = '21000000-0000-4000-8000-000000000003'
const targetUserId = '21000000-0000-4000-8000-000000000004'

const context = {
  params: Promise.resolve({ worldId, campaignId }),
}

function request(body?: string) {
  return new Request('http://localhost/campaign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body }),
  })
}

describe('Campaign lifecycle API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: ownerId })
    mocks.transferOwnership.mockResolvedValue({
      id: campaignId,
      ownerId: targetUserId,
      status: 'ACTIVE',
    })
    mocks.endCampaign.mockResolvedValue({
      id: campaignId,
      ownerId,
      status: 'ENDED',
    })
    mocks.archiveCampaign.mockResolvedValue({
      id: campaignId,
      ownerId,
      status: 'ARCHIVED',
    })
    mocks.deleteCampaign.mockResolvedValue(undefined)
  })

  it('authenticates before attempting ownership transfer', async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(unauthenticated())

    const response = await transferOwnership(
      request(JSON.stringify({ targetUserId })),
      context,
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    })
    expect(mocks.transferOwnership).not.toHaveBeenCalled()
  })

  it('rejects malformed transfer bodies and invalid JSON', async () => {
    const malformed = await transferOwnership(
      request(JSON.stringify({ targetUserId: 'not-a-uuid' })),
      context,
    )
    expect(malformed.status).toBe(400)
    await expect(malformed.json()).resolves.toMatchObject({
      error: { code: 'INVALID_CAMPAIGN_INPUT' },
    })

    const invalidJson = await transferOwnership(request('{'), context)
    expect(invalidJson.status).toBe(400)
    await expect(invalidJson.json()).resolves.toMatchObject({
      error: { code: 'INVALID_JSON' },
    })
    expect(mocks.transferOwnership).not.toHaveBeenCalled()
  })

  it('passes authenticated transfer scope to the service', async () => {
    const response = await transferOwnership(
      request(JSON.stringify({ targetUserId })),
      context,
    )

    expect(response.status).toBe(200)
    expect(mocks.transferOwnership).toHaveBeenCalledWith({
      campaignId,
      worldId,
      actorUserId: ownerId,
      targetUserId,
    })
  })

  it('maps transfer authorization failures to forbidden', async () => {
    mocks.transferOwnership.mockRejectedValue(
      new CampaignDomainError(
        'CAMPAIGN_OWNERSHIP_TRANSFER_FORBIDDEN',
        'Forbidden.',
      ),
    )

    const response = await transferOwnership(
      request(JSON.stringify({ targetUserId })),
      context,
    )
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'CAMPAIGN_OWNERSHIP_TRANSFER_FORBIDDEN' },
    })
  })

  it('maps invalid lifecycle transitions to conflict', async () => {
    mocks.archiveCampaign.mockRejectedValue(
      new CampaignDomainError(
        'CAMPAIGN_INVALID_STATUS_TRANSITION',
        'Invalid transition.',
      ),
    )

    const response = await archiveCampaign(request(), context)
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'CAMPAIGN_INVALID_STATUS_TRANSITION' },
    })
  })

  it('passes end requests through the owner-scoped service boundary', async () => {
    const response = await endCampaign(request(), context)
    expect(response.status).toBe(200)
    expect(mocks.endCampaign).toHaveBeenCalledWith({
      campaignId,
      worldId,
      actorUserId: ownerId,
    })
  })

  it('enforces authentication and authorization for deletion', async () => {
    mocks.deleteCampaign.mockRejectedValueOnce(
      new CampaignDomainError('CAMPAIGN_DELETE_FORBIDDEN', 'Forbidden.'),
    )
    const forbidden = await DELETE(request(), context)
    expect(forbidden.status).toBe(403)

    mocks.requireAuthenticatedUser.mockRejectedValueOnce(unauthenticated())
    const unauthorized = await DELETE(request(), context)
    expect(unauthorized.status).toBe(401)
  })

  it('returns no content after deleting the Campaign scope', async () => {
    const response = await DELETE(request(), context)
    expect(response.status).toBe(204)
    expect(mocks.deleteCampaign).toHaveBeenCalledWith({
      campaignId,
      worldId,
      actorUserId: ownerId,
    })
  })
})
