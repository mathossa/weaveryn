export type UiArtwork = Readonly<{
  slug: string
  name: string
  src: string
  alt: string
  width: number
  height: number
}>

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
      alt: 'Candlelit fantasy map room with an open stone map table',
      width: 2172,
      height: 724,
    },
  },
  fallbacks: {
    world: '/images/worlds/default.webp',
    campaign: '/images/campaigns/default.webp',
    character: '/images/characters/default.webp',
  },
} as const
