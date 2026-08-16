export interface CampaignFormInput {
  name: string
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

export function parseCampaignFormInput(value: unknown): CampaignFormInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CampaignInputError('Campaign input must be an object.')
  }

  const input = value as Record<string, unknown>
  const name = requiredString(input.name, 'Campaign name')
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

  if (name.length > 120) {
    throw new CampaignInputError('Campaign name must be 120 characters or fewer.')
  }

  const description =
    input.description === undefined || input.description === null
      ? null
      : typeof input.description === 'string'
        ? input.description.trim() || null
        : (() => {
            throw new CampaignInputError('Campaign description must be text.')
          })()

  return { name, description, currentWorldPosition, currentWorldDateLabel }
}
