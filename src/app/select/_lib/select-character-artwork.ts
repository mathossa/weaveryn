import { uiAssets } from '@/lib/ui-assets'

type SelectCharacterArtwork = Readonly<{
  hero: string
  portrait?: string
}>

// Temporary launcher artwork registry. Add future character-specific hero and
// portrait assets here without changing selector layout or interaction code.
const selectCharacterArtworkByName = {
  bodwick: {
    hero: uiAssets.select.hero.bodwick,
    portrait: uiAssets.select.portraits.bodwick,
  },
} as const satisfies Record<string, SelectCharacterArtwork>

// Characters without dedicated launcher artwork use a full-body generic hero.
// Their own character image still remains the portrait shown in the selector row.
const defaultSelectCharacterArtwork = {
  hero: '/images/select/hero/default.webp',
} as const satisfies SelectCharacterArtwork

function normalizeCharacterName(name: string) {
  return name.trim().toLocaleLowerCase('en-US')
}

export function resolveSelectCharacterArtwork(
  ...names: Array<string | null | undefined>
): SelectCharacterArtwork | null {
  for (const name of names) {
    if (!name) continue
    const normalized = normalizeCharacterName(name)
    const artwork =
      selectCharacterArtworkByName[
        normalized as keyof typeof selectCharacterArtworkByName
      ]
    if (artwork) return artwork
  }

  return defaultSelectCharacterArtwork
}
