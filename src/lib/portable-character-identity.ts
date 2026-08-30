export interface PortableCharacterIdentity {
  description: string | null
  ancestry: string | null
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function portableCharacterIdentity(
  coreData: unknown,
): PortableCharacterIdentity {
  const data = record(coreData)
  return {
    description: text(data?.description),
    ancestry: text(data?.ancestry),
  }
}
