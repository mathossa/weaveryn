export interface WorldFormInput {
  name: string
  description?: string | null
}

export class WorldInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorldInputError'
  }
}

export function parseWorldFormInput(value: unknown): WorldFormInput {
  if (!value || typeof value !== 'object') {
    throw new WorldInputError('World input must be an object.')
  }

  const record = value as Record<string, unknown>
  if (typeof record.name !== 'string') {
    throw new WorldInputError('World name is required.')
  }

  const name = record.name.trim()
  if (name.length < 1 || name.length > 120) {
    throw new WorldInputError(
      'World name must be between 1 and 120 characters.',
    )
  }

  let description: string | null | undefined
  if (record.description === null || record.description === '') {
    description = null
  } else if (record.description !== undefined) {
    if (typeof record.description !== 'string') {
      throw new WorldInputError('World description must be text.')
    }
    description = record.description.trim()
    if (description.length > 4000) {
      throw new WorldInputError(
        'World description must be 4000 characters or less.',
      )
    }
  }

  return { name, description }
}
