import { describe, expect, it } from 'vitest'
import { WorldEventDomainError } from './world-event-errors'
import type { WorldReckoningRecord } from './world-event-repository'
import {
  resolveWorldDate,
  worldDateInputFromPosition,
} from './world-date-resolver'

const cataclysm: WorldReckoningRecord = {
  id: '10000000-0000-4000-8000-000000000001',
  worldId: '10000000-0000-4000-8000-000000000002',
  name: 'Cataclysm Reckoning',
  anchorWorldPosition: '0',
  anchorWorldDateLabel: 'Year 0',
  beforeLabel: 'Before Cataclysm',
  beforeAbbreviation: 'BC',
  afterLabel: 'After Cataclysm',
  afterAbbreviation: 'AC',
  createdAt: new Date('2026-08-21T00:00:00.000Z'),
  updatedAt: new Date('2026-08-21T00:00:00.000Z'),
}

const rebuild: WorldReckoningRecord = {
  ...cataclysm,
  id: '10000000-0000-4000-8000-000000000003',
  name: 'Rebuild Reckoning',
  anchorWorldPosition: '200',
  anchorWorldDateLabel: '200 AC',
  beforeLabel: 'Before Rebuild',
  beforeAbbreviation: 'BR',
  afterLabel: 'After Rebuild',
  afterAbbreviation: 'AR',
}

describe('World date resolver', () => {
  it('uses a simple signed World year when no reckoning is selected', () => {
    expect(resolveWorldDate({ year: '-25' }, [])).toMatchObject({
      worldPosition: '-25',
      worldDateLabel: 'Year -25',
      reckoningId: null,
      direction: null,
    })
  })

  it('resolves before and after notation around an anchor', () => {
    expect(
      resolveWorldDate(
        { year: '400', reckoningId: cataclysm.id, direction: 'BEFORE' },
        [cataclysm],
      ),
    ).toMatchObject({ worldPosition: '-400', worldDateLabel: '400 BC' })

    expect(
      resolveWorldDate(
        { year: '200', reckoningId: cataclysm.id, direction: 'AFTER' },
        [cataclysm],
      ),
    ).toMatchObject({ worldPosition: '200', worldDateLabel: '200 AC' })
  })

  it('allows overlapping reckonings to describe the same canonical date', () => {
    const afterCataclysm = resolveWorldDate(
      { year: '100', reckoningId: cataclysm.id, direction: 'AFTER' },
      [cataclysm, rebuild],
    )
    const beforeRebuild = resolveWorldDate(
      { year: '100', reckoningId: rebuild.id, direction: 'BEFORE' },
      [cataclysm, rebuild],
    )

    expect(afterCataclysm.worldPosition).toBe('100')
    expect(beforeRebuild.worldPosition).toBe('100')
    expect(afterCataclysm.worldDateLabel).toBe('100 AC')
    expect(beforeRebuild.worldDateLabel).toBe('100 BR')
  })

  it('reconstructs the selected reckoning notation for editing', () => {
    expect(
      worldDateInputFromPosition('100', rebuild.id, 'BEFORE', [
        cataclysm,
        rebuild,
      ]),
    ).toEqual({ year: '100', reckoningId: rebuild.id, direction: 'BEFORE' })
  })

  it('rejects invalid reckoning dates', () => {
    expect(() =>
      resolveWorldDate(
        { year: '-1', reckoningId: cataclysm.id, direction: 'AFTER' },
        [cataclysm],
      ),
    ).toThrowError(
      expect.objectContaining({
        code: 'WORLD_EVENT_DATE_INVALID',
      }) as WorldEventDomainError,
    )
  })
})
