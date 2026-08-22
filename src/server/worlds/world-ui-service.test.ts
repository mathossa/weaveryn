import { describe, expect, it } from 'vitest'
import { shouldCheckOwnedActiveCampaignForClaim } from './world-ui-service'

describe('World ownership claim query gate', () => {
  it('skips active Campaign ownership checks when they cannot affect the claim result', () => {
    expect(
      shouldCheckOwnedActiveCampaignForClaim({
        ownerId: 'owner-1',
        membershipRole: null,
        adminMembershipCount: 0,
      }),
    ).toBe(false)
    expect(
      shouldCheckOwnedActiveCampaignForClaim({
        ownerId: null,
        membershipRole: 'ADMIN',
        adminMembershipCount: 1,
      }),
    ).toBe(false)
    expect(
      shouldCheckOwnedActiveCampaignForClaim({
        ownerId: null,
        membershipRole: 'MEMBER',
        adminMembershipCount: 0,
      }),
    ).toBe(false)
    expect(
      shouldCheckOwnedActiveCampaignForClaim({
        ownerId: null,
        membershipRole: 'VIEWER',
        adminMembershipCount: 1,
      }),
    ).toBe(false)
  })

  it('checks active Campaign ownership only when it can establish an orphan claim', () => {
    expect(
      shouldCheckOwnedActiveCampaignForClaim({
        ownerId: null,
        membershipRole: 'VIEWER',
        adminMembershipCount: 0,
      }),
    ).toBe(true)
    expect(
      shouldCheckOwnedActiveCampaignForClaim({
        ownerId: null,
        membershipRole: null,
        adminMembershipCount: 0,
      }),
    ).toBe(true)
  })
})
