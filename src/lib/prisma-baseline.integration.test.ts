import { describe, expect, it } from 'vitest'
import { prisma } from './prisma'

const REQUIRED_DATABASE_CHECKS = [
  'Campaign_active_context_check',
  'WorldEntity_worldCharacter_same_world_check',
  'WorldEntity_image_focus_x_check',
  'WorldEntity_image_focus_y_check',
  'MembershipInvitation_target_role_check',
  'WorldEvent_end_not_before_start_check',
  'WorldEvent_start_reckoning_pair_check',
  'WorldEvent_end_reckoning_pair_check',
  'WorldEvent_end_date_pair_check',
] as const

describe('pre-0.1.0 Prisma baseline', () => {
  it.each(REQUIRED_DATABASE_CHECKS)(
    'preserves database-only CHECK constraint %s',
    async (constraintName) => {
      const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM pg_constraint AS constraint_record
          JOIN pg_namespace AS namespace_record
            ON namespace_record.oid = constraint_record.connamespace
          WHERE namespace_record.nspname = 'public'
            AND constraint_record.contype = 'c'
            AND constraint_record.conname = ${constraintName}
        ) AS "exists"
      `

      expect(rows).toEqual([{ exists: true }])
    },
  )
})
