import { describe, expect, it } from 'vitest'
import { resolveCampaignEntryContext } from './campaign-entry-context'
import type { CampaignOverview } from './campaign-ui-service'

const character = { worldCharacterId: 'bodwick', ownedByCurrentUser: true }
const campaign = {
  isOwner: true,
  role: 'GM',
  canEditSharedInfo: true,
  canUpdateCurrentLocation: true,
  canDelete: true,
  characters: [
    character,
    { worldCharacterId: 'foreign', ownedByCurrentUser: false },
  ],
} as CampaignOverview

describe('Campaign active entry context', () => {
  it('separates owned Character entry from the same User’s Weaver permissions', () => {
    const entry = resolveCampaignEntryContext(campaign, {
      requestedWorldCharacterId: 'bodwick',
    })
    expect(entry).toMatchObject({
      mode: 'threadwalker',
      character,
      isWeaver: false,
      canManageCampaign: false,
      canUpdateCurrentLocation: false,
      canUpdateFocus: false,
    })
    expect(campaign.canEditSharedInfo).toBe(true)
  })
  it('honors explicit Weaver entry instead of remembered Character identity', () => {
    expect(
      resolveCampaignEntryContext(campaign, {
        mode: 'weaver',
        preferredWorldCharacterId: 'bodwick',
      }),
    ).toMatchObject({
      mode: 'weaver',
      character: undefined,
      canManageCampaign: true,
      canUpdateCurrentLocation: true,
    })
  })
  it('keeps explicit Threadwatcher entry read-only even for an owner', () => {
    expect(
      resolveCampaignEntryContext(campaign, {
        mode: 'threadwatcher',
        requestedWorldCharacterId: 'bodwick',
      }),
    ).toMatchObject({
      mode: 'threadwatcher',
      character: undefined,
      canManageCampaign: false,
      canUpdateCurrentLocation: false,
      canUpdateFocus: false,
    })
  })
  it.each(['foreign', 'missing'])(
    'rejects explicit invalid Character %s',
    (requestedWorldCharacterId) => {
      expect(
        resolveCampaignEntryContext(campaign, { requestedWorldCharacterId }),
      ).toBeNull()
    },
  )
  it('does not grant Weaver entry to a player and preserves a granted location capability', () => {
    const player = {
      ...campaign,
      isOwner: false,
      role: 'PLAYER' as const,
      canEditSharedInfo: false,
    }
    expect(resolveCampaignEntryContext(player, { mode: 'weaver' })).toBeNull()
    expect(
      resolveCampaignEntryContext(player, {
        requestedWorldCharacterId: 'bodwick',
      }),
    ).toMatchObject({
      mode: 'threadwalker',
      canUpdateCurrentLocation: true,
      canUpdateFocus: false,
    })
  })
  it('restores valid remembered Character entry and ignores stale preferences', () => {
    expect(
      resolveCampaignEntryContext(campaign, {
        preferredWorldCharacterId: 'bodwick',
      })?.mode,
    ).toBe('threadwalker')
    expect(
      resolveCampaignEntryContext(campaign, {
        preferredWorldCharacterId: 'missing',
      })?.mode,
    ).toBe('weaver')
  })
})
