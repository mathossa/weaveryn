export function withCharacterContext(
  href: string,
  worldCharacterId?: string | null,
) {
  if (!worldCharacterId) return href

  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}character=${encodeURIComponent(worldCharacterId)}`
}

export function withCampaignContext(
  href: string,
  campaignId?: string | null,
  worldCharacterId?: string | null,
) {
  let contextualHref = href

  if (campaignId) {
    const separator = contextualHref.includes('?') ? '&' : '?'
    contextualHref = `${contextualHref}${separator}campaign=${encodeURIComponent(campaignId)}`
  }

  return withCharacterContext(contextualHref, worldCharacterId)
}

export function requestedCharacterContext(
  value: string | string[] | undefined,
) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
