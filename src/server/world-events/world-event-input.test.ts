import { describe, expect, it } from 'vitest'
import {
  parseCreateWorldEventInput,
  WorldEventInputError,
} from './world-event-input'

const entityId = '30000000-0000-4000-8000-000000000001'

describe('World event API input', () => {
  it('accepts the documented long title and description boundaries', () => {
    const title = 'T'.repeat(160)
    const description = 'D'.repeat(10_000)

    const parsed = parseCreateWorldEventInput({
      title,
      description,
      startDate: { year: '999999999' },
      entityIds: [entityId, entityId],
    })

    expect(parsed.title).toBe(title)
    expect(parsed.description).toBe(description)
    expect(parsed.entityIds).toEqual([entityId])
  })

  it('rejects content beyond the bounded event fields', () => {
    expect(() =>
      parseCreateWorldEventInput({
        title: 'T'.repeat(161),
        startDate: { year: '1' },
      }),
    ).toThrow(WorldEventInputError)

    expect(() =>
      parseCreateWorldEventInput({
        title: 'Valid title',
        description: 'D'.repeat(10_001),
        startDate: { year: '1' },
      }),
    ).toThrow(WorldEventInputError)
  })

  it('keeps widely separated signed World years as human-facing date input', () => {
    const ancient = parseCreateWorldEventInput({
      title: 'Ancient foundation',
      startDate: { year: '-900000' },
    })
    const future = parseCreateWorldEventInput({
      title: 'Distant ascension',
      startDate: { year: '900000' },
    })

    expect(ancient.startDate.year).toBe('-900000')
    expect(future.startDate.year).toBe('900000')
  })

  it('caps linked entities so one event stays bounded', () => {
    const entityIds = Array.from(
      { length: 31 },
      (_, index) =>
        `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    )

    expect(() =>
      parseCreateWorldEventInput({
        title: 'Too many participants',
        startDate: { year: '1' },
        entityIds,
      }),
    ).toThrow('An event may link at most 30 entities.')
  })
})
