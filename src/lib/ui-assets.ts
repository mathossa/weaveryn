export type UiArtwork = Readonly<{
  slug: string
  name: string
  src: string
  alt: string
  width: number
  height: number
}>

const entityFallbacks = {
  person: {
    slug: 'person',
    name: 'The Many Faces',
    src: '/images/entities/person.webp',
    alt: 'Several varied fantasy people gathered in warm light',
    width: 1536,
    height: 1024,
  },
  location: {
    slug: 'location',
    name: 'A Place in the World',
    src: '/images/entities/location.webp',
    alt: 'Fantasy settlement and keep in a mountain valley',
    width: 1536,
    height: 1024,
  },
  organization: {
    slug: 'organization',
    name: 'The Convening',
    src: '/images/entities/organization.webp',
    alt: 'Fantasy council gathered around a map table',
    width: 1536,
    height: 1024,
  },
  item: {
    slug: 'item',
    name: 'Relic of the Unknown',
    src: '/images/entities/item.webp',
    alt: 'Ornate blue-crystal fantasy relic on a dark map table',
    width: 1536,
    height: 1024,
  },
  event: {
    slug: 'event',
    name: 'The Turning Hour',
    src: '/images/entities/event.webp',
    alt: 'Travelers witnessing a celestial event over a dark landscape',
    width: 1536,
    height: 1024,
  },
  deity: {
    slug: 'deity',
    name: 'The Silent Divinity',
    src: '/images/entities/deity.webp',
    alt: 'Monumental otherworldly stone divinity in a cavernous sanctuary',
    width: 1536,
    height: 1024,
  },
  creature: {
    slug: 'creature',
    name: 'Beyond the Firelight',
    src: '/images/entities/creature.webp',
    alt: 'Original pale horned fantasy beast in a shadowed forest',
    width: 1536,
    height: 1024,
  },
  quest: {
    slug: 'quest',
    name: 'The Road Ahead',
    src: '/images/entities/quest.webp',
    alt: 'Lantern-bearing traveler facing a distant tower at dusk',
    width: 1536,
    height: 1024,
  },
  generic: {
    slug: 'generic',
    name: 'The Unwritten Archive',
    src: '/images/entities/generic.webp',
    alt: 'Candlelit archive with an open codex and connected points of light',
    width: 1536,
    height: 1024,
  },
} as const satisfies Record<string, UiArtwork>

const generalFallbacks = {
  world: '/images/worlds/default.webp',
  campaign: '/images/campaigns/default.webp',
  character: '/images/characters/default.webp',
} as const

function normalizeEntityArtworkType(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[\s/_-]+/g, ' ')
    .trim()
}

export function resolveEntityFallbackArtwork(entityType: string): string {
  switch (normalizeEntityArtworkType(entityType)) {
    case 'character':
      return generalFallbacks.character
    case 'person':
    case 'npc':
    case 'person npc':
      return entityFallbacks.person.src
    case 'location':
      return entityFallbacks.location.src
    case 'organization':
    case 'faction':
    case 'faction organization':
      return entityFallbacks.organization.src
    case 'item':
      return entityFallbacks.item.src
    case 'event':
      return entityFallbacks.event.src
    case 'deity':
      return entityFallbacks.deity.src
    case 'creature':
      return entityFallbacks.creature.src
    case 'quest':
    case 'story object':
    case 'quest story object':
      return entityFallbacks.quest.src
    default:
      return entityFallbacks.generic.src
  }
}

export const uiAssets = {
  brand: {
    logo: {
      src: '/images/brand/weaveryn-logo.png',
      alt: 'Weaveryn celestial globe logo',
      width: 1269,
      height: 1240,
    },
  },
  backgrounds: {
    appShell: {
      src: '/images/backgrounds/app-shell.webp',
      alt: 'Mountain realm with illuminated fantasy cities at twilight',
      width: 1672,
      height: 941,
    },
    authShell: {
      src: '/images/backgrounds/auth-shell.webp',
      alt: 'Fantasy observatory overlooking a mountain realm beneath a starry sky',
      width: 1672,
      height: 941,
    },
    entityBanner: {
      src: '/images/backgrounds/entity-banner.webp',
      alt: 'Candlelit cartographer hall with maps, shelves, and artifacts',
      width: 2160,
      height: 720,
    },
  },
  entityFallbacks,
  fallbacks: generalFallbacks,
  resolveEntityFallbackArtwork,
} as const
