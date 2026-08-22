import { describe, expect, it } from 'vitest'
import {
  campaignAccessibleToUserWhere,
  worldAccessibleToUserWhere,
} from './prisma-access-predicates'

const userId = '50000000-0000-4000-8000-000000000001'

describe('Prisma access predicates', () => {
  it('builds Campaign access from ownership or membership', () => {
    expect(campaignAccessibleToUserWhere(userId)).toEqual({
      OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
    })
  })

  it('builds World access from ownership, membership, or accessible Campaigns', () => {
    expect(worldAccessibleToUserWhere(userId)).toEqual({
      OR: [
        { ownerId: userId },
        { memberships: { some: { userId } } },
        {
          campaigns: {
            some: {
              OR: [
                { ownerId: userId },
                { memberships: { some: { userId } } },
              ],
            },
          },
        },
      ],
    })
  })
})
