import { describe, expect, it } from 'vitest'
import { availableCampaignManagementSections } from './campaign-management-sections'

describe('Campaign management hub sections', () => {
  it('shows all focused destinations to an active Campaign owner', () => {
    expect(
      availableCampaignManagementSections({
        canEditSharedInfo: true,
        canManageMembers: true,
        canDelete: true,
      }),
    ).toEqual(['details', 'members', 'characters', 'time', 'advanced'])
  })

  it('keeps owner-only destinations away from delegated managers', () => {
    expect(
      availableCampaignManagementSections({
        canEditSharedInfo: true,
        canManageMembers: false,
        canDelete: false,
      }),
    ).toEqual(['details', 'characters', 'time'])
  })

  it('limits an archived Campaign owner to Advanced options', () => {
    expect(
      availableCampaignManagementSections({
        canEditSharedInfo: false,
        canManageMembers: false,
        canDelete: true,
      }),
    ).toEqual(['advanced'])
  })
})
