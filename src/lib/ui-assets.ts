export type UiArtwork = Readonly<{
  slug: string
  name: string
  src: string
  alt: string
  width: number
  height: number
}>
export type UiBrandArtwork = Readonly<{
  src: string
  alt: string
  width: number
  height: number
}>

type EntityArtworkBase = Pick<UiArtwork, 'slug' | 'name' | 'alt'>

const entityArtworkBases = {
  person: {
    slug: 'person',
    name: 'The Many Faces',
    alt: 'Fantasy person or non-player character portrait',
  },
  location: {
    slug: 'location',
    name: 'A Place in the World',
    alt: 'Fantasy location landscape or settlement',
  },
  organization: {
    slug: 'organization',
    name: 'The Convening',
    alt: 'Organized fantasy gathering or council',
  },
  item: {
    slug: 'item',
    name: 'Relic of the Unknown',
    alt: 'Original fantasy item or relic',
  },
  event: {
    slug: 'event',
    name: 'The Turning Hour',
    alt: 'People witnessing a consequential fantasy event',
  },
  deity: {
    slug: 'deity',
    name: 'The Silent Divinity',
    alt: 'Monumental religiously neutral fantasy divinity',
  },
  creature: {
    slug: 'creature',
    name: 'Beyond the Firelight',
    alt: 'Original fantasy creature in a natural landscape',
  },
  quest: {
    slug: 'quest',
    name: 'The Road Ahead',
    alt: 'Fantasy route, threshold, or distant destination',
  },
  generic: {
    slug: 'generic',
    name: 'The Unwritten Archive',
    alt: 'Unlabeled fantasy archive or collection of records',
  },
} as const satisfies Record<string, EntityArtworkBase>

type EntityArtworkKind = keyof typeof entityArtworkBases

const entityArtworkDimensions = {
  person: [
    [868, 1158],
    [543, 724],
    [868, 1158],
    [868, 1158],
    [868, 1158],
    [868, 1158],
  ],
  location: Array.from({ length: 6 }, () => [724, 543] as const),
  organization: Array.from({ length: 6 }, () => [724, 543] as const),
  item: Array.from({ length: 6 }, () => [627, 627] as const),
  event: Array.from({ length: 6 }, () => [724, 543] as const),
  deity: Array.from({ length: 6 }, () => [724, 543] as const),
  creature: Array.from({ length: 6 }, () => [506, 506] as const),
  quest: Array.from({ length: 6 }, () => [768, 512] as const),
  generic: Array.from({ length: 6 }, () => [768, 512] as const),
} as const satisfies Record<
  EntityArtworkKind,
  readonly (readonly [number, number])[]
>

const entityArtworkFileSlugs = {
  person: 'person',
  location: 'location',
  organization: 'organization',
  item: 'item',
  event: 'event',
  deity: 'deity',
  creature: 'creature',
  quest: 'quest',
  generic: 'Generic',
} as const satisfies Record<EntityArtworkKind, string>

const entityArtwork = Object.fromEntries(
  (Object.keys(entityArtworkBases) as EntityArtworkKind[]).map((kind) => {
    const base = entityArtworkBases[kind]
    const fileSlug = entityArtworkFileSlugs[kind]
    const choices = entityArtworkDimensions[kind].map(
      ([width, height], index): UiArtwork => {
        const option = index + 1
        const suffix = String(option).padStart(2, '0')
        return {
          ...base,
          slug: kind + '-' + suffix,
          name: option === 1 ? base.name : base.name + ' · Option ' + option,
          src: '/images/entities/' + fileSlug + '-' + suffix + '.webp',
          alt: base.alt + ' (option ' + option + ' of 6)',
          width,
          height,
        }
      },
    )
    return [kind, choices]
  }),
) as unknown as Record<EntityArtworkKind, readonly UiArtwork[]>

const entityFallbacks = Object.fromEntries(
  (Object.keys(entityArtwork) as EntityArtworkKind[]).map((kind) => [
    kind,
    entityArtwork[kind][0],
  ]),
) as unknown as Record<EntityArtworkKind, UiArtwork>

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

function resolveEntityArtworkKind(
  entityType: string,
): EntityArtworkKind | 'character' {
  switch (normalizeEntityArtworkType(entityType)) {
    case 'character':
      return 'character'
    case 'person':
    case 'npc':
    case 'person npc':
      return 'person'
    case 'location':
      return 'location'
    case 'organization':
    case 'faction':
    case 'faction organization':
      return 'organization'
    case 'item':
      return 'item'
    case 'event':
      return 'event'
    case 'deity':
      return 'deity'
    case 'creature':
      return 'creature'
    case 'quest':
    case 'story object':
    case 'quest story object':
      return 'quest'
    default:
      return 'generic'
  }
}

export function resolveEntityArtworkChoices(
  entityType: string,
): readonly UiArtwork[] {
  const kind = resolveEntityArtworkKind(entityType)
  return kind === 'character' ? [] : entityArtwork[kind]
}

export function resolveEntityFallbackArtwork(entityType: string): string {
  const kind = resolveEntityArtworkKind(entityType)
  return kind === 'character'
    ? generalFallbacks.character
    : entityFallbacks[kind].src
}

const entityArtworkSources = new Set(
  Object.values(entityArtwork).flatMap((choices) =>
    choices.map((artwork) => artwork.src),
  ),
)

export function isEntityArtworkSource(value: string) {
  return entityArtworkSources.has(value.trim())
}

// The round logo and horizontal wordmark are intentionally separate brand
// concepts. Keep this nullable until an approved wordmark asset is supplied.
const brandWordmark: UiBrandArtwork | null = null

export const uiAssets = {
  brand: {
    logo: {
      src: '/images/brand/weaveryn-logo.png',
      alt: 'Weaveryn celestial globe logo',
      width: 1269,
      height: 1240,
    },
    wordmark: brandWordmark,
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
      width: 1086,
      height: 362,
    },
  },
  select: {
    backgroundDesktop: {
      src: '/images/select/background-desktop.webp',
      alt: 'Golden mountain valley and ancient fantasy ruins at dawn',
      width: 2560,
      height: 1440,
    },
    hero: {
      bodwick: '/images/select/hero/bodwick.webp',
    },
  },
  ui: {
    frames: {
      goldRect: '/images/ui/frames/gold-rect-frame.png',
      goldCircle: '/images/ui/frames/gold-circle-frame.png',
      goldPrimaryAction: '/images/ui/frames/gold-primary-action-frame.png',
    },
    textures: {
      blackGoldVeins: '/images/ui/textures/black-gold-veins.webp',
    },
  },
  entityArtwork,
  entityFallbacks,
  fallbacks: generalFallbacks,
  isEntityArtworkSource,
  resolveEntityArtworkChoices,
  resolveEntityFallbackArtwork,
} as const
