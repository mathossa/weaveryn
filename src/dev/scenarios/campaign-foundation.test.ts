import { describe, expect, it } from 'vitest'
import { isCampaignFoundationAction } from './campaign-foundation'

describe('Campaign foundation scenario action validation', () => {
  it.each([
    { action: 'create-campaign', actor: 'WORLD_OWNER' },
    { action: 'create-campaign', actor: 'WORLD_ADMIN' },
    { action: 'create-campaign', actor: 'WORLD_MEMBER' },
    { action: 'update-admin-campaign', actor: 'CAMPAIGN_OWNER' },
    { action: 'update-admin-campaign', actor: 'WORLD_OWNER' },
  ])('accepts the allowlisted action $action for $actor', (action) => {
    expect(isCampaignFoundationAction(action)).toBe(true)
  })

  it.each([
    null,
    {},
    { action: 'create-campaign', actor: 'OUTSIDER' },
    { action: 'delete-campaign', actor: 'WORLD_OWNER' },
    {
      action: 'create-campaign',
      actor: 'WORLD_OWNER',
      campaignId: 'arbitrary',
    },
  ])('rejects malformed or non-allowlisted input', (action) => {
    expect(isCampaignFoundationAction(action)).toBe(false)
  })
})
