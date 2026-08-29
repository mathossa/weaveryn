# Weaveryn UI image assets

Production UI artwork is stored in `public/images`. The asset set is intentionally
small because worlds, campaigns, characters, and World entities can eventually use
user-provided artwork.

## Asset groups

| Group                | Location                                | Intended use                                           |
| -------------------- | --------------------------------------- | ------------------------------------------------------ |
| Brand                | `public/images/brand`                   | Header, authentication, and navigation branding        |
| Backgrounds          | `public/images/backgrounds`             | App shell, authentication, entity screens, and banners |
| World fallback       | `public/images/worlds/default.webp`     | World cards, headers, and empty image state            |
| Campaign fallback    | `public/images/campaigns/default.webp`  | Campaign cards, headers, and empty image state         |
| Character fallback   | `public/images/characters/default.webp` | Character cards, avatars, and empty image state        |
| World entity artwork | `public/images/entities`                | Six selectable images per semantic World entity type   |

The World, Campaign, and Character `default.webp` files remain their stable shared
fallback paths. World entity artwork is different: the UI resolves a semantic
fallback from the entity's runtime type while keeping `WorldEntity.type` free-form.

## World entity artwork and semantic fallbacks

`src/lib/ui-assets.ts` centrally registers six artwork choices for each
supported World entity category. The create/edit form shows the choices for the
current runtime type and saves options 2–6 through the existing nullable
`WorldEntity.image` value. Choosing **Default** leaves that value empty so the
first choice remains the type-aware fallback. A custom image path or URL still
takes precedence over every built-in fallback.

`resolveEntityFallbackArtwork()` supplies the first registered choice only when
an entity has no saved image. `resolveEntityArtworkChoices()` supplies the six
creator-selectable choices without turning the free-form entity type into an enum.

| Runtime type / safe alias                           | Default and selectable files              |
| --------------------------------------------------- | ----------------------------------------- |
| `character`                                         | Existing Character fallback; no choices   |
| `person`, `npc`, `Person / NPC`                     | `person-01.webp` through `-06.webp`       |
| `location`                                          | `location-01.webp` through `-06.webp`     |
| `organization`, `faction`, `Faction / Organization` | `organization-01.webp` through `-06.webp` |
| `item`                                              | `item-01.webp` through `-06.webp`         |
| `event`                                             | `event-01.webp` through `-06.webp`        |
| `deity`                                             | `deity-01.webp` through `-06.webp`        |
| `creature`                                          | `creature-01.webp` through `-06.webp`     |
| `quest`, `story object`, `Quest / story object`     | `quest-01.webp` through `-06.webp`        |
| blank or any unknown/custom type                    | `Generic-01.webp` through `-06.webp`      |

Matching is case-insensitive, trims surrounding whitespace, and tolerates harmless
spacing or separator differences. It deliberately does not use broad fuzzy matching,
so a custom type such as `Questmaster` or `NPC Guild` remains custom and uses
the Generic collection.

Artwork selection is presentation-only. It does not change entity persistence,
authorization, visibility, custom type registration, or the free-form nature of
`WorldEntity.type`. Built-in selection reuses the existing image field and does
not introduce a schema or storage service.

### Entity workspace banner

`public/images/backgrounds/entity-banner.webp` is page-level atmosphere for the
World entity workspace. It is used as the compact decorative banner above the entity
browser and as the browser empty-state background. It is not an entity fallback;
unknown custom types use `Generic-01.webp` when no image is saved.

## Code-configurable presentation

Weaveryn presentation is intentionally configurable from the codebase rather than
from persisted user preferences.

- Artwork paths and intrinsic dimensions live in `src/lib/ui-assets.ts`. Replacing
  a configured shared asset changes every component that consumes it; screens
  should not duplicate those paths.
- Shared brand rendering lives in `src/components/ui/brand-logo.tsx` and `brand-wordmark.tsx`; the round logo and horizontal wordmark remain distinct assets.
- Shared buttons live in `src/components/ui/button.tsx` and its CSS module. Screens
  should use the shared variants instead of defining unrelated primary button
  styles.
- Semantic production UI tokens such as accent colors, control surfaces, radii,
  focus rings, and panel shadows live in `src/app/globals.css` under the `--ui-*`
  variables.
- Screen shells such as the authentication background component consume the shared
  asset configuration and tokens. Future screens should follow the same pattern
  when a presentation choice is expected to be reused.

### Brand wordmark readiness

The authenticated shell is ready to consume a dedicated horizontal wordmark, but no
approved wordmark currently exists in the repository. Until the owner supplies one,
`BrandWordmark` renders a restrained text fallback from the same shared component.
Do not repurpose the round celestial globe logo as a wordmark.

Owner asset brief:

- **Proposed path:** `public/images/brand/weaveryn-wordmark.svg`
- **Semantic purpose:** the horizontal Weaveryn logotype beside the distinct round
  logo in shared authenticated chrome and compatible future brand surfaces.
- **Recommended size:** an `880 × 160` SVG viewBox (about `5.5:1`); it must remain
  legible when rendered around `24px` high.
- **Transparency:** required; no baked background, frame, shadow, or glow.
- **Crop and focal point:** center the complete word with minimal, even horizontal
  breathing room; keep all letterforms and thread terminals inside the viewBox so
  narrow header crops never clip them.
- **Visual direction:** restrained dark-fantasy/editorial lettering, warm parchment
  to antique-gold strokes, readable custom serif forms, and very subtle woven-thread
  terminals. Avoid ornate blackletter, novelty fonts, crests, globes, illustrations,
  gradients that disappear at small size, or extra symbols.
- **Where it appears:** the shared authenticated header, including `/select`; the
  CSS allows an image to replace the fallback without page-specific styling.
- **Image-generation prompt:** “Create a clean horizontal vector wordmark spelling
  ‘Weaveryn’ exactly. Restrained fantasy-editorial custom serif lettering, elegant
  and highly readable, with subtle interwoven-thread terminals and an antique-gold
  to warm-parchment monochrome treatment. Transparent background. Wide 5.5:1
  composition, center-safe, crisp and legible at 24 px high. No globe, round logo,
  crest, icon, landscape, character, border, shadow, motto, or additional text.”

### Authenticated app shell

Production screens after login should use the shared components under
`src/components/app-shell` rather than creating page-specific navigation chrome.

- `AuthenticatedAppShell` resolves the authenticated User on the server and
  redirects unauthenticated requests to `/login`.
- `AppShell` renders the shared application background, branding, responsive
  context navigation, account menu, and logout action. Its launcher variant reuses the registered `appShell` background with a quieter central veil and replaces context controls with a static thread separator.
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

Each semantic category has six metadata-stripped WebP choices, and every file is
kept below 250 KB. Native source dimensions are retained: Person artwork is
868×1158 except option 2 at 543×724; Location, Organization, Event, and Deity are
724×543; Item is 627×627; Creature is 506×506; Quest and Generic are 768×512. The
workspace banner is 1086×362. Components use constrained cover crops and stored
focal points so these portrait, square, and landscape sources remain responsive.
