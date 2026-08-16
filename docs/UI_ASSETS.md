# Weaveryn UI image assets

Production UI artwork is stored in `public/images`. The asset set is intentionally
small because worlds, campaigns, and characters will eventually use user-uploaded
artwork.

## Asset groups

| Group              | Location                                | Intended use                                           |
| ------------------ | --------------------------------------- | ------------------------------------------------------ |
| Brand              | `public/images/brand`                   | Header, authentication, and navigation branding        |
| Backgrounds        | `public/images/backgrounds`             | App shell, authentication, entity screens, and banners |
| World fallback     | `public/images/worlds/default.webp`     | World cards, headers, and empty image state            |
| Campaign fallback  | `public/images/campaigns/default.webp`  | Campaign cards, headers, and empty image state         |
| Character fallback | `public/images/characters/default.webp` | Character cards, avatars, and empty image state        |

There is exactly one fallback per entity type. `default.webp` is the stable path
used by the application; the current artwork is the Thalorin world scene, The
Verdant Vale campaign scene, and the neutral character fallback.

## Code-configurable presentation

Weaveryn presentation is intentionally configurable from the codebase rather
than from persisted user preferences.

- Artwork paths and intrinsic dimensions live in `src/lib/ui-assets.ts`.
  Replacing the configured authentication background or brand logo changes every
  shared component that consumes that asset; screens should not duplicate those
  paths.
- Shared brand rendering lives in `src/components/ui/brand-logo.tsx`.
- Shared buttons live in `src/components/ui/button.tsx` and its CSS module.
  Screens should use the shared variants instead of defining unrelated primary
  button styles.
- Semantic production UI tokens such as accent colors, control surfaces, radii,
  focus rings, and panel shadows live in `src/app/globals.css` under the
  `--ui-*` variables.
- Screen shells such as the authentication background component consume the
  shared asset configuration and tokens. Future screens should follow the same
  pattern when a presentation choice is expected to be reused.

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
