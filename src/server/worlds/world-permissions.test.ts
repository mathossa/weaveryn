import { describe, expect, it } from 'vitest'
import type { WorldRole } from './world-membership-repository'
import {
  WORLD_PERMISSIONS,
  hasWorldPermission,
  type WorldAccess,
  type WorldPermission,
} from './world-permissions'

function access(role: WorldRole | null, isOwner = false): WorldAccess {
  return {
    worldId: 'world-1',
    ownerId: 'owner-1',
    userId: isOwner ? 'owner-1' : 'user-1',
    isOwner,
    role,
  }
}

const permissions = Object.values(WORLD_PERMISSIONS)

describe('World permissions', () => {
  it.each(permissions)('grants the owner %s', (permission) => {
    expect(hasWorldPermission(access(null, true), permission)).toBe(true)
  })

  it.each<[WorldRole, WorldPermission[]]>([
    [
      'ADMIN',
      [
        WORLD_PERMISSIONS.VIEW_WORLD,
        WORLD_PERMISSIONS.EDIT_CONTENT,
        WORLD_PERMISSIONS.MANAGE_MEMBERS,
        WORLD_PERMISSIONS.CREATE_CAMPAIGN,
      ],
    ],
    [
      'MEMBER',
      [
        WORLD_PERMISSIONS.VIEW_WORLD,
        WORLD_PERMISSIONS.EDIT_CONTENT,
        WORLD_PERMISSIONS.CREATE_CAMPAIGN,
      ],
    ],
    ['VIEWER', [WORLD_PERMISSIONS.VIEW_WORLD]],
  ])('grants only the documented permissions to %s', (role, granted) => {
    for (const permission of permissions) {
      expect(hasWorldPermission(access(role), permission)).toBe(
        granted.includes(permission),
      )
    }
  })

  it('lets a World MEMBER create Campaigns without granting member management', () => {
    expect(
      hasWorldPermission(access('MEMBER'), WORLD_PERMISSIONS.CREATE_CAMPAIGN),
    ).toBe(true)
    expect(
      hasWorldPermission(access('MEMBER'), WORLD_PERMISSIONS.MANAGE_MEMBERS),
    ).toBe(false)
  })

  it('keeps World VIEWER Campaign creation read-only', () => {
    expect(
      hasWorldPermission(access('VIEWER'), WORLD_PERMISSIONS.CREATE_CAMPAIGN),
    ).toBe(false)
  })

  it('does not grant World permissions to a non-member', () => {
    for (const permission of permissions) {
      expect(hasWorldPermission(access(null), permission)).toBe(false)
    }
  })
})
