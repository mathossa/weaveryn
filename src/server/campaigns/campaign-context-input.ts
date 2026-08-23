import { CampaignInputError } from './campaign-input'

export const CAMPAIGN_CURRENT_FOCUS_MAX_LENGTH = 280

export interface CampaignContextUpdateInput {
  currentLocationId?: string | null
  currentFocus?: string | null
}

function optionalNullableText(
  value: unknown,
  label: string,
  maxLength: number,
) {
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new CampaignInputError(`${label} must be text or null.`)
  }
  const normalized = value.trim()
  if (!normalized) return null
  if (normalized.length > maxLength) {
    throw new CampaignInputError(
      `${label} must be ${maxLength} characters or fewer.`,
    )
  }
  return normalized
}

export function parseCampaignContextUpdateInput(
  value: unknown,
): CampaignContextUpdateInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CampaignInputError('Campaign context input must be an object.')
  }
  const input = value as Record<string, unknown>
  const hasLocation = Object.hasOwn(input, 'currentLocationId')
  const hasFocus = Object.hasOwn(input, 'currentFocus')
  if (!hasLocation && !hasFocus) {
    throw new CampaignInputError(
      'Current Location or current focus must be provided.',
    )
  }

  let currentLocationId: string | null | undefined
  if (hasLocation) {
    currentLocationId = optionalNullableText(
      input.currentLocationId,
      'Current Location',
      100,
    )
  }

  let currentFocus: string | null | undefined
  if (hasFocus) {
    currentFocus = optionalNullableText(
      input.currentFocus,
      'Current focus',
      CAMPAIGN_CURRENT_FOCUS_MAX_LENGTH,
    )
  }

  return {
    ...(hasLocation ? { currentLocationId } : {}),
    ...(hasFocus ? { currentFocus } : {}),
  }
}
