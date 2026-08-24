const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface CampaignFormInput {
  name: string
  description: string | null
  currentWorldPosition: string
  currentWorldDateLabel: string
}

export interface CampaignManagementInput {
  name?: string
  description: string | null
  currentWorldPosition: string
  currentWorldDateLabel: string
}

export class CampaignInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CampaignInputError'
  }
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CampaignInputError(`${label} is required.`)
  }
  return value.trim()
}

function descriptionValue(value: unknown) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    throw new CampaignInputError('Campaign description must be text.')
  }
  return value.trim() || null
}

function timelineValues(input: Record<string, unknown>) {
  const currentWorldPosition = requiredString(
    input.currentWorldPosition,
    'Timeline position',
  )
  const currentWorldDateLabel = requiredString(
    input.currentWorldDateLabel,
    'World date label',
  )

  if (!Number.isFinite(Number(currentWorldPosition))) {
    throw new CampaignInputError('Timeline position must be numeric.')
  }

  return { currentWorldPosition, currentWorldDateLabel }
}

function inputObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CampaignInputError('Campaign input must be an object.')
  }
  return value as Record<string, unknown>
}

export function parseCampaignFormInput(value: unknown): CampaignFormInput {
  const input = inputObject(value)
  const name = requiredString(input.name, 'Campaign name')
  if (name.length > 120) {
    throw new CampaignInputError(
      'Campaign name must be 120 characters or fewer.',
    )
  }

  return {
    name,
    description: descriptionValue(input.description),
    ...timelineValues(input),
  }
}

export function parseCampaignManagementInput(
  value: unknown,
): CampaignManagementInput {
  const input = inputObject(value)
  const name =
    input.name === undefined
      ? undefined
      : requiredString(input.name, 'Campaign name')

  if (name && name.length > 120) {
    throw new CampaignInputError(
      'Campaign name must be 120 characters or fewer.',
    )
  }

  return {
    ...(name === undefined ? {} : { name }),
    description: descriptionValue(input.description),
    ...timelineValues(input),
  }
}

export interface CampaignOwnershipTransferInput {
  targetUserId: string
}

export function parseCampaignOwnershipTransferInput(
  value: unknown,
): CampaignOwnershipTransferInput {
  const input = inputObject(value)
  if (
    typeof input.targetUserId !== 'string' ||
    !UUID_PATTERN.test(input.targetUserId)
  ) {
    throw new CampaignInputError('Target user must be a valid UUID.')
  }
  return { targetUserId: input.targetUserId }
}
