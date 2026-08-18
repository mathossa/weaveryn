# Campaign dashboard asset handoff

Issue: #53

The MVP Campaign dashboard intentionally uses reusable inline SVG line icons and existing fallback artwork so the layout can be implemented before final custom art exists.

## Format rule

Use:

- **SVG** for interface icons and glyphs.
- **WebP** for illustrative raster artwork such as Campaign/adventure banners, maps, portraits, and atmospheric placeholders.
- **ICO** only for favicon/platform-icon use where required; do not use it for normal application UI icons.

UI SVGs should preferably be monochrome/vector artwork that works with `currentColor`, a common view box, and the existing Weaveryn semantic colors.

## Custom SVG icons to create later

Recommended final icon set:

- `campaign-note.svg`
- `campaign-event.svg`
- `campaign-dice.svg`
- `campaign-map.svg`
- `campaign-npc.svg`
- `campaign-item.svg`
- `campaign-entities.svg`
- `campaign-timeline.svg`
- `campaign-manage.svg`
- `campaign-party.svg`
- `campaign-activity.svg`
- `campaign-objective.svg`
- `campaign-status.svg`
- `campaign-location.svg`

Suggested visual direction:

- thin fantasy/cartographic line work;
- subtle celestial/rune influence matching the Weaveryn brand;
- readable at 20–32 px;
- no baked-in color where possible;
- avoid overly detailed illustrations that become muddy at button size.

The current temporary versions live in:

`src/app/world/[worldId]/campaign/[campaignId]/_components/campaign-dashboard-icon.tsx`

Replacing the SVG path data there should not require dashboard component changes.

## WebP artwork to create later

### Campaign / Current Adventure hero

Suggested asset:

`campaign-adventure-placeholder.webp`

Purpose:

- atmospheric fallback when a Campaign has no custom/current-adventure artwork;
- wide cinematic composition;
- should tolerate dark left-side text overlays and a small right-side context card.

Suggested source size: approximately **1600 × 700** or larger at a similar wide aspect ratio.

### Current Area Map placeholder

Suggested asset:

`campaign-map-placeholder.webp`

Purpose:

- stylized fantasy regional/local map used until real map data exists;
- should look credible behind a location marker and dark UI overlay;
- avoid text labels baked into the image because the application will add its own labels.

Suggested source size: approximately **1400 × 900** or larger.

## Existing assets currently reused

Until the dedicated artwork exists, the implementation reuses centrally registered fallback/background artwork from `src/lib/ui-assets.ts`.

Do not add one-off hard-coded image paths to individual dashboard panels when replacing these placeholders; register final shared artwork centrally first.
