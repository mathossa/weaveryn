import { describe, expect, it } from 'vitest'
import {
  campaignRoleLabel,
  worldAccessLabel,
  worldRoleLabel,
} from './role-labels'

describe('Weaveryn role labels', () => {
  it('keeps Campaign permission codes behind fantasy-facing names', () => {
    expect(campaignRoleLabel('GM')).toBe('Weaver')
    expect(campaignRoleLabel('ASSISTANT_GM')).toBe('Weaver (Assistant)')
    expect(campaignRoleLabel('PLAYER')).toBe('Threadwalker')
    expect(campaignRoleLabel('SPECTATOR')).toBe('Threadwatcher')
  })

  it('uses the same role family for World membership', () => {
    expect(worldRoleLabel('ADMIN')).toBe('Weaver (Admin)')
    expect(worldRoleLabel('MEMBER')).toBe('Threadwalker')
    expect(worldRoleLabel('VIEWER')).toBe('Threadwatcher')
  })

  it('labels World access without exposing backend enums', () => {
    expect(worldAccessLabel('OWNER')).toBe('Weaver (Owner)')
    expect(worldAccessLabel('ADMIN')).toBe('Weaver (Admin)')
    expect(worldAccessLabel('MEMBER')).toBe('Threadwalker')
    expect(worldAccessLabel('VIEWER')).toBe('Threadwatcher')
    expect(worldAccessLabel('CAMPAIGN_ONLY')).toBe('Campaign access')
  })
})
