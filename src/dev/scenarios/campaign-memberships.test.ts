import { describe, expect, it } from 'vitest'
import { isCampaignMembershipScenarioAction } from './campaign-memberships'

describe('Campaign memberships visual scenario action validation', () => {
  it('accepts only registered fixed membership actions and roles', () => {
    expect(
      isCampaignMembershipScenarioAction({ action: 'add', role: 'PLAYER' }),
    ).toBe(true)
    expect(
      isCampaignMembershipScenarioAction({
        action: 'unauthorized-add',
        actor: 'ASSISTANT_GM',
      }),
    ).toBe(true)
    expect(
      isCampaignMembershipScenarioAction({
        action: 'change-player-to-assistant',
      }),
    ).toBe(true)
  })

  it('rejects arbitrary roles, actors, targets, and extra request fields', () => {
    expect(
      isCampaignMembershipScenarioAction({ action: 'add', role: 'OWNER' }),
    ).toBe(false)
    expect(
      isCampaignMembershipScenarioAction({
        action: 'unauthorized-add',
        actor: 'OWNER',
      }),
    ).toBe(false)
    expect(
      isCampaignMembershipScenarioAction({
        action: 'add',
        role: 'PLAYER',
        userId: 'arbitrary-user',
      }),
    ).toBe(false)
  })
})
