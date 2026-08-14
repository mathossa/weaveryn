# Weaveryn UI image assets

The production UI artwork is stored in `public/images`. It follows the visual
direction established by the concept screens in `docs/images/concepts`:

- near-black and deep-blue environments
- restrained antique-gold and ember lighting
- painterly, grounded fantasy scenery
- mature 2D/2.5D character portraits
- clean image content without baked-in UI, typography, borders, or logos

The existing `logo_weaveryn.png` concept was copied unchanged to
`public/images/brand/weaveryn-logo.png`.

## Asset groups

| Group | Location | Intended use |
| --- | --- | --- |
| Brand | `public/images/brand` | Header, authentication, and navigation branding |
| Backgrounds | `public/images/backgrounds` | Full-page shell and authentication backdrop |
| Worlds | `public/images/worlds` | World cards, recent-world cards, and world headers |
| Campaigns | `public/images/campaigns` | Campaign cards and recent-campaign cards |
| Characters | `public/images/characters` | Character cards, recent-character cards, and avatars |

Each content group includes `default.webp`, a neutral fallback for records that
do not yet have user-provided artwork. Named demo assets correspond to the
worlds, campaigns, and characters shown in the concept screens.

The typed path, dimensions, and accessible-alt manifest lives in
`src/lib/ui-assets.ts`.

## Rendering guidance

- Use `next/image` with the dimensions from the manifest or `fill` inside a
  constrained aspect-ratio container.
- Use `object-fit: cover` for cards. The main landmark or face is kept near the
  safe center so narrower mobile crops remain usable.
- Apply gradients, vignette, borders, selection states, badges, and text in CSS
  rather than modifying the raster artwork.
- The background is deliberately darker and quieter near its center so form and
  navigation overlays retain contrast.
- Prefer user-uploaded artwork when present and use the matching fallback only
  when no image is available.

## Generation and optimization

The environment and portrait artwork was generated with the built-in image
generation workflow using the in-repository concept screens as style references.
Every prompt required original, text-free artwork without watermarks, UI chrome,
logos, or recognizable copyrighted settings or characters.

Environment prompts specified the individual realm or campaign landmark and a
wide 3:2 crop. Character prompts specified the four concept characters and a
vertical 3:4 crop. Neutral fallback prompts described an unnamed misty realm, an
unstarted campfire journey, and an indistinct hooded traveler.

Generated PNG sources were stripped of metadata and converted to WebP for the
application. The transparent logo remains PNG so its existing alpha and visual
appearance are preserved exactly.
