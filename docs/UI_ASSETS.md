# Weaveryn UI image assets

Production UI artwork is stored in `public/images`. The asset set is intentionally
small because worlds, campaigns, characters, and World entities can eventually use
user-provided artwork.

## Asset groups

| Group                    | Location                                | Intended use                                           |
| ------------------------ | --------------------------------------- | ------------------------------------------------------ |
| Brand                    | `public/images/brand`                   | Header, authentication, and navigation branding        |
| Backgrounds              | `public/images/backgrounds`             | App shell, authentication, entity screens, and banners |
| World fallback           | `public/images/worlds/default.webp`     | World cards, headers, and empty image state            |
| Campaign fallback        | `public/images/campaigns/default.webp`  | Campaign cards, headers, and empty image state         |
| Character fallback       | `public/images/characters/default.webp` | Character cards, avatars, and empty image state        |
| World entity fallbacks   | `public/images/entities`                | Semantic defaults for World entities without artwork   |

The World, Campaign, and Character `default.webp` files remain their stable shared
fallback paths. World entity artwork is different: the UI resolves a semantic
fallback from the entity's runtime type while keeping `WorldEntity.type` free-form.

## World entity semantic fallbacks

`src/lib/ui-assets.ts` owns the shared `resolveEntityFallbackArtwork()` resolver.
Screens must prefer an entity's explicit image first and call the resolver only when
that image is empty.

| Runtime type / safe alias                         | Default asset                                |
| ------------------------------------------------- | -------------------------------------------- |
| `character`                                       | Existing Character fallback                  |
| `person`, `npc`, `Person / NPC`                   | `public/images/entities/person.webp`         |
| `location`                                        | `public/images/entities/location.webp`       |
| `organization`, `faction`, `Faction / Organization` | `public/images/entities/organization.webp` |
| `item`                                            | `public/images/entities/item.webp`           |
| `event`                                           | `public/images/entities/event.webp`          |
| `deity`                                           | `public/images/entities/deity.webp`          |
| `creature`                                        | `public/images/entities/creature.webp`       |
| `quest`, `story object`, `Quest / story object`   | `public/images/entities/quest.webp`          |
| blank or any unknown/custom type                  | `public/images/entities/generic.webp`        |

Matching is case-insensitive, trims surrounding whitespace, and tolerates harmless
spacing or separator differences. It deliberately does not use broad fuzzy matching,
so a custom type such as `Questmaster` or `NPC Guild` stays custom and receives the
Generic fallback rather than being silently reclassified.

The semantic artwork is presentation-only. Adding or changing a fallback does not
change entity persistence, authorization, visibility, custom type registration, or
turn `WorldEntity.type` into an enum.

### Entity workspace banner

`public/images/backgrounds/entity-banner.webp` is page-level atmosphere for the
World entity workspace. It is used as the compact decorative banner above the entity
browser and as the browser empty-state background. It is **not** a generic entity
fallback; unknown custom types use `entities/generic.webp` instead.

## Code-configurable presentation

Weaveryn presentation is intentionally configurable from the codebase rather than
from persisted user preferences.

- Artwork paths and intrinsic dimensions live in `src/lib/ui-assets.ts`. Replacing
  a configured shared asset changes every component that consumes it; screens
  should not duplicate those paths.
- Shared brand rendering lives in `src/components/ui/brand-logo.tsx`.
- Shared buttons live in `src/components/ui/button.tsx` and its CSS module. Screens
  should use the shared variants instead of defining unrelated primary button
  styles.
- Semantic production UI tokens such as accent colors, control surfaces, radii,
  focus rings, and panel shadows live in `src/app/globals.css` under the `--ui-*`
  variables.
- Screen shells such as the authentication background component consume the shared
  asset configuration and tokens. Future screens should follow the same pattern
  when a presentation choice is expected to be reused.

### Authenticated app shell

Production screens after login should use the shared components under
`src/components/app-shell` rather than creating page-specific navigation chrome.

- `AuthenticatedAppShell` resolves the authenticated User on the server and
  redirects unauthenticated requests to `/login`.
- `AppShell` renders the shared application background, branding, responsive
  context navigation, account menu, and logout action.
- Desktop uses a single top bar. World, Campaign, and Character context can be
  presented as a compact hierarchy in that bar.
- Phone and narrow layouts keep the top bar to three controls: logo, one compact
  current-context button, and profile. The context button displays the deepest
  active context and opens a sheet with the full hierarchy.
- `AppPage` provides the standard production content width and page heading area.
- `StatusPanel` provides shared empty, loading, and error presentation.

The shell accepts context as presentation data only. Domain authorization and the
set of contexts a User may access remain backend-owned; the shell must not infer
those rules from route names or client-side state.

This is a developer-controlled presentation layer. A user-facing theme editor,
runtime theme selection, and persisted theme preferences are not implied by this
structure.

## Responsive rendering

- Prefer explicit/user artwork when present and use the matching fallback only when
  no image is available.
- Use `next/image` with the dimensions from `src/lib/ui-assets.ts` or `fill` inside a
  constrained aspect-ratio container where that component is already appropriate.
- Use `object-fit: cover` for cards and banners. World entity defaults are composed
  around a center-safe focal area so the same image remains useful in card, square,
  detail-banner, desktop, and narrow-phone crops.
- Preserve stored entity focal-point behavior for explicit images and semantic
  fallbacks alike.
- Apply gradients, vignette, borders, selection states, badges, and all button or
  menu chrome in CSS. Raster artwork is not used for interactive controls.
- Environmental artwork is part of the information hierarchy: location and World
  art may anchor a composition while legible gradients carry the content.
- Prefer a few strong regions over many equally bordered cards. Antique gold is a
  focus and interaction accent, not a border applied to every surface.
- Player phone views prioritize quick Campaign and Character lookup with compact
  real destinations. Do not render disabled future tabs or fake map/notes panels.
- World home uses the World fallback as an atmospheric overview until user artwork
  and the future Atlas are available. Do not add a competing dashboard/map preview
  merely to fill space.
- Campaign Current Location uses the authorized real Location's explicit image when
  present, otherwise the semantic Location fallback. If no Current Location exists,
  the existing Campaign fallback and empty-state behavior remain unchanged.
- Campaign Around You uses only authorized real entities and relationships. Missing
  explicit artwork resolves by entity type; fallback artwork never implies
  fabricated content.

## Generation and optimization

The artwork follows the Weaveryn direction established by the concept screens:

- near-black and deep-blue environments
- restrained antique-gold and ember lighting
- painterly, grounded fantasy scenery
- natural materials and readable silhouettes at small card sizes
- clean image content without baked-in UI, typography, borders, logos, or
  watermarks

The nine semantic World entity defaults are 1536×1024 WebP files. The entity
workspace banner is 2160×720 WebP. Final production files are metadata-stripped and
kept below 250 KB each so the defaults remain lightweight while still supporting
responsive crops.
