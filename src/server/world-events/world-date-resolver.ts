import {
  worldEventDateInvalid,
  worldReckoningNotFound,
} from './world-event-errors'
import type {
  ReckoningDirection,
  WorldReckoningRecord,
} from './world-event-repository'

const SIGNED_YEAR_PATTERN = /^-?\d+$/
const UNSIGNED_YEAR_PATTERN = /^\d+$/
const ZERO = BigInt(0)
const MAX_ABSOLUTE_YEAR = BigInt('999999999999999999')

export interface WorldDateInput {
  year: string
  reckoningId?: string | null
  direction?: ReckoningDirection | null
}

export interface ResolvedWorldDate {
  year: string
  worldPosition: string
  worldDateLabel: string
  reckoningId: string | null
  direction: ReckoningDirection | null
}

function parseYear(value: string, allowNegative: boolean) {
  const normalized = value.trim()
  const pattern = allowNegative ? SIGNED_YEAR_PATTERN : UNSIGNED_YEAR_PATTERN
  if (!pattern.test(normalized)) {
    throw worldEventDateInvalid(
      allowNegative
        ? 'Year must be a whole number.'
        : 'A reckoning year must be zero or a positive whole number.',
    )
  }

  const year = BigInt(normalized)
  const absolute = year < ZERO ? -year : year
  if (absolute > MAX_ABSOLUTE_YEAR) {
    throw worldEventDateInvalid('Year is outside the supported range.')
  }
  return year
}

function parsePosition(value: string) {
  if (!SIGNED_YEAR_PATTERN.test(value)) {
    throw worldEventDateInvalid(
      'This chronology position cannot be represented by the current simple year resolver.',
    )
  }
  return BigInt(value)
}

function reckoningSuffix(
  reckoning: WorldReckoningRecord,
  direction: ReckoningDirection,
) {
  if (direction === 'BEFORE') {
    return reckoning.beforeAbbreviation?.trim() || reckoning.beforeLabel
  }
  return reckoning.afterAbbreviation?.trim() || reckoning.afterLabel
}

export function resolveWorldDate(
  input: WorldDateInput,
  reckonings: readonly WorldReckoningRecord[],
): ResolvedWorldDate {
  const reckoningId = input.reckoningId?.trim() || null

  if (!reckoningId) {
    if (input.direction) {
      throw worldEventDateInvalid(
        'Before/after direction requires a selected year system.',
      )
    }
    const year = parseYear(input.year, true)
    return {
      year: year.toString(),
      worldPosition: year.toString(),
      worldDateLabel: `Year ${year.toString()}`,
      reckoningId: null,
      direction: null,
    }
  }

  const reckoning = reckonings.find((candidate) => candidate.id === reckoningId)
  if (!reckoning) throw worldReckoningNotFound(reckoningId)
  if (input.direction !== 'BEFORE' && input.direction !== 'AFTER') {
    throw worldEventDateInvalid(
      'Choose whether the date is before or after the selected anchor.',
    )
  }

  const year = parseYear(input.year, false)
  const anchor = parsePosition(reckoning.anchorWorldPosition)
  const worldPosition =
    input.direction === 'BEFORE' ? anchor - year : anchor + year

  return {
    year: year.toString(),
    worldPosition: worldPosition.toString(),
    worldDateLabel: `${year.toString()} ${reckoningSuffix(reckoning, input.direction)}`,
    reckoningId,
    direction: input.direction,
  }
}

export function worldDateInputFromPosition(
  worldPosition: string,
  reckoningId: string | null,
  direction: ReckoningDirection | null,
  reckonings: readonly WorldReckoningRecord[],
): WorldDateInput {
  if (!reckoningId) {
    return { year: parsePosition(worldPosition).toString() }
  }

  const reckoning = reckonings.find((candidate) => candidate.id === reckoningId)
  if (!reckoning) {
    return { year: parsePosition(worldPosition).toString() }
  }

  const position = parsePosition(worldPosition)
  const anchor = parsePosition(reckoning.anchorWorldPosition)
  const inferredDirection: ReckoningDirection =
    direction ?? (position < anchor ? 'BEFORE' : 'AFTER')
  const distance = position >= anchor ? position - anchor : anchor - position

  return {
    year: distance.toString(),
    reckoningId,
    direction: inferredDirection,
  }
}

export function compareWorldPositions(left: string, right: string) {
  const leftValue = parsePosition(left)
  const rightValue = parsePosition(right)
  if (leftValue < rightValue) return -1
  if (leftValue > rightValue) return 1
  return 0
}
