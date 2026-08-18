const KNOWN_CONNECTION_LABELS: Record<string, string> = {
  RELATED_TO: 'is related to',
  CONNECTED_TO: 'is connected to',
  LOCATED_IN: 'is located in',
  LOCATED_AT: 'is located at',
  PART_OF: 'is part of',
  MEMBER_OF: 'is a member of',
  OWNED_BY: 'is owned by',
  OWNS: 'owns',
  WORKS_FOR: 'works for',
  LEADS: 'leads',
  KNOWS: 'knows',
  ALLIED_WITH: 'is allied with',
  HOSTILE_TO: 'is hostile to',
  HOSTS: 'hosts',
  STORES: 'stores',
  PROTECTS: 'protects',
  RULED_BY: 'is ruled by',
}

export function connectionTypeLabel(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const known = KNOWN_CONNECTION_LABELS[trimmed.toUpperCase()]
  if (known) return known

  if (trimmed.includes('_') || trimmed === trimmed.toUpperCase()) {
    return trimmed.replaceAll('_', ' ').toLocaleLowerCase()
  }

  return trimmed
}
