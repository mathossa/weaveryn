# World Chronology and Canonical History

Status: MVP foundation introduced by #113; full calendar configuration remains #69.

## Principle

Weaveryn stores one canonical World history and projects it through human-friendly date systems. The internal sortable coordinate is not the date format authors are expected to understand or enter.

Three related concepts remain deliberately separate:

1. **Canonical World position** — the authoritative sortable coordinate used by World events and Campaign temporal context.
2. **Reckoning / epoch** — a human year-numbering system anchored to a canonical World position, such as Before/After Cataclysm or Before/After Rebuild.
3. **Calendar structure** — the later configurable system for months, weeks, weekdays, hours, seasons, leap/intercalary rules, moons, solar cycles, and display formatting.

## World events

The main World timeline contains `WorldEvent` records with:

- title and optional description
- `startWorldPosition`
- optional `endWorldPosition` for duration events
- human-facing start/end date labels
- optional start/end reckoning identity and direction, so the chosen notation can be reconstructed when editing
- zero or more `WorldEventEntity` links to existing World entities

An end position may equal the start position but must never precede it.

Point events and duration events use the same model so List, scale/Gantt-style, and Calendar views can be projections of the same canonical history.

## Human-facing dates

Normal event authoring uses the World Date Resolver. Authors enter a World year and, optionally, choose a configured reckoning and whether the date is before or after its anchor. Weaveryn resolves that date to the canonical position and stores a human-facing label.

The MVP always provides a simple World year. Raw canonical positions are not shown as normal event-entry fields.

## Overlapping reckonings

Reckonings are not a fixed `BC | AD` enum and are not required to form one linear sequence. A World may define many anchors and the same canonical moment may have multiple legitimate labels.

Example:

- Cataclysm Reckoning is anchored at the Cataclysm and exposes BC / AC.
- Rebuild Reckoning is anchored 200 World years later and exposes BR / AR.
- A moment 100 years after the Cataclysm is both `100 AC` and `100 BR`.

The event remembers the notation chosen by the author while ordering remains based on the shared canonical position.

## Authorization

World authorization remains authoritative:

- World owner: view/edit history and configure chronology.
- World `ADMIN`: view/edit history and configure chronology.
- World `MEMBER` (Threadwalker): view/create/edit/delete World events.
- World `VIEWER` (Threadwatcher): view only.
- Campaign-only access does not grant unrestricted access to canonical World history.

Chronology configuration uses `MANAGE_CONFIGURATION`; event authoring uses normal `EDIT_CONTENT`.

## Calendar boundary (#69)

The complete fantasy-calendar engine extends the resolver rather than replacing World events or their canonical positions. It may add:

- custom day length and optional named hours
- week length and weekday names
- months and month lengths
- intercalary/festival days and leap rules
- seasons
- multiple moons with cycle lengths and offsets
- solar-cycle information
- richer date formatting and calendar pickers

Derived facts such as weekday, season, or moon phase should normally be calculated from the calendar definition and canonical position instead of being duplicated into every `WorldEvent`.

This boundary lets Worlds start with simple chronology in the MVP while preserving a stable history model for later calendar depth.
