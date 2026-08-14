export type UiArtwork = Readonly<{
  slug: string;
  name: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}>;

export const uiAssets = {
  brand: {
    logo: {
      src: "/images/brand/weaveryn-logo.png",
      alt: "Weaveryn celestial globe logo",
      width: 1269,
      height: 1240,
    },
  },
  backgrounds: {
    appShell: {
      src: "/images/backgrounds/app-shell.webp",
      alt: "Mountain realm with illuminated fantasy cities at twilight",
      width: 1672,
      height: 941,
    },
  },
  fallbacks: {
    world: "/images/worlds/default.webp",
    campaign: "/images/campaigns/default.webp",
    character: "/images/characters/default.webp",
  },
} as const;

export const worldArtwork = [
  {
    slug: "eldoria",
    name: "Eldoria",
    src: "/images/worlds/eldoria.webp",
    alt: "Mountain kingdom and castle city at golden sunset",
    width: 1536,
    height: 1024,
  },
  {
    slug: "nythoria",
    name: "Nythoria",
    src: "/images/worlds/nythoria.webp",
    alt: "Moonlit black-stone castle above an icy valley",
    width: 1536,
    height: 1024,
  },
  {
    slug: "keldarim",
    name: "Keldarim",
    src: "/images/worlds/keldarim.webp",
    alt: "Moss-covered mountain citadel beneath storm clouds",
    width: 1536,
    height: 1024,
  },
  {
    slug: "vaelun",
    name: "Vaelun",
    src: "/images/worlds/vaelun.webp",
    alt: "Violet crystalline realm surrounding an arcane rift",
    width: 1536,
    height: 1024,
  },
  {
    slug: "thalorin",
    name: "Thalorin",
    src: "/images/worlds/thalorin.webp",
    alt: "Ancient forest ruins beneath immense trees",
    width: 1536,
    height: 1024,
  },
  {
    slug: "drakoria",
    name: "Drakoria",
    src: "/images/worlds/drakoria.webp",
    alt: "Volcanic fortress city crossed by lava channels",
    width: 1536,
    height: 1024,
  },
  {
    slug: "frostgard",
    name: "Frostgard",
    src: "/images/worlds/frostgard.webp",
    alt: "Icebound fortress in a snow-covered mountain basin",
    width: 1536,
    height: 1024,
  },
  {
    slug: "aurelia",
    name: "Aurelia",
    src: "/images/worlds/aurelia.webp",
    alt: "Radiant domed city of pale stone and gold",
    width: 1536,
    height: 1024,
  },
] as const satisfies readonly UiArtwork[];

export const campaignArtwork = [
  {
    slug: "crown-of-ashes",
    name: "Crown of Ashes",
    src: "/images/campaigns/crown-of-ashes.webp",
    alt: "Castle city threatened by fire beneath an ash-filled sunset",
    width: 1536,
    height: 1024,
  },
  {
    slug: "whispers-in-the-deep",
    name: "Whispers in the Deep",
    src: "/images/campaigns/whispers-in-the-deep.webp",
    alt: "Flooded ancient temple with a distant blue-lit arch",
    width: 1536,
    height: 1024,
  },
  {
    slug: "the-verdant-vale",
    name: "The Verdant Vale",
    src: "/images/campaigns/the-verdant-vale.webp",
    alt: "Warm woodland lodge beside a forest stream",
    width: 1536,
    height: 1024,
  },
  {
    slug: "sands-of-time",
    name: "Sands of Time",
    src: "/images/campaigns/sands-of-time.webp",
    alt: "Desert capital with a luminous hourglass-shaped gate",
    width: 1536,
    height: 1024,
  },
  {
    slug: "frostbound-oath",
    name: "Frostbound Oath",
    src: "/images/campaigns/frostbound-oath.webp",
    alt: "Snowbound mountain keep beyond a path of oath stones",
    width: 1536,
    height: 1024,
  },
  {
    slug: "shadows-of-the-arcanum",
    name: "Shadows of the Arcanum",
    src: "/images/campaigns/shadows-of-the-arcanum.webp",
    alt: "Violet crystal suspended in a shadowed arcane hall",
    width: 1536,
    height: 1024,
  },
] as const satisfies readonly UiArtwork[];

export const characterArtwork = [
  {
    slug: "aldric",
    name: "Aldric",
    src: "/images/characters/aldric.webp",
    alt: "Aldric, a dark-haired human paladin in blackened armor",
    width: 1086,
    height: 1448,
  },
  {
    slug: "lyra",
    name: "Lyra",
    src: "/images/characters/lyra.webp",
    alt: "Lyra, an elven ranger in a deep-green cloak",
    width: 1086,
    height: 1448,
  },
  {
    slug: "durin",
    name: "Durin",
    src: "/images/characters/durin.webp",
    alt: "Durin, a red-bearded dwarven fighter in dark armor",
    width: 1086,
    height: 1448,
  },
  {
    slug: "vaelyn",
    name: "Vaelyn",
    src: "/images/characters/vaelyn.webp",
    alt: "Vaelyn, a violet horned sorcerer holding arcane light",
    width: 1086,
    height: 1448,
  },
] as const satisfies readonly UiArtwork[];
