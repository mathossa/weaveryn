export function withCharacterContext(
  href: string,
  worldCharacterId?: string | null,
) {
  if (!worldCharacterId) return href

  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}character=${encodeURIComponent(worldCharacterId)}`
}

export function requestedCharacterContext(
  value: string | string[] | undefined,
) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
