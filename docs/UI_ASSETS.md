# Weaveryn UI image assets

Production UI artwork is stored in `public/images`. The asset set is intentionally
small because worlds, campaigns, and characters will eventually use user-uploaded
artwork.

## Asset groups

| Group | Location | Intended use |
| --- | --- | --- |
| Brand | `public/images/brand` | Header, authentication, and navigation branding |
| Backgrounds | `public/images/backgrounds` | App shell, authentication, entity screens, and banners |
| World fallback | `public/images/worlds/default.webp` | World cards, headers, and empty image state |
| Campaign fallback | `public/images/campaigns/default.webp` | Campaign cards, headers, and empty image state |
| Character fallback | `public/images/characters/default.webp` | Character cards, avatars, and empty image state |

There is exactly one fallback per entity type. `default.webp` is the stable path
used by the application; the current artwork is the Thalorin world scene, The
Verdant Vale campaign scene, and the neutral character fallback.

## Responsive rendering

- Prefer user-uploaded artwork when present and use the matching fallback only
  when no image is available.
- Use `next/image` with the dimensions from `src/lib/ui-assets.ts` or `fill`
  inside a constrained aspect-ratio container.
- Use `object-fit: cover` for cards and banners. Keep the focal point near the
  safe center so narrow crops remain useful on phones.
- Apply gradients, vignette, borders, selection states, badges, and all button
  or menu chrome in CSS. Raster artwork is not used for interactive controls.
- The backgrounds have deliberately quiet center areas so text, navigation, and
  form controls remain legible on phones, tablets, and desktop screens.

## Generation and optimization

The artwork follows the Weaveryn direction established by the concept screens:

- near-black and deep-blue environments
- restrained antique-gold and ember lighting
- painterly, grounded fantasy scenery
- clean image content without baked-in UI, typography, borders, or logos

Generated PNG sources were stripped of metadata and converted to WebP for the
application. The transparent logo remains PNG so its existing alpha and visual
appearance are preserved exactly.
