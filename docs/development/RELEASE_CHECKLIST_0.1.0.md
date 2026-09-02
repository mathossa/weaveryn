# Weaveryn 0.1.0 release checklist

This checklist is the final release-readiness matrix for the first Weaveryn MVP.
It supplements the general policy in `RELEASES.md`; it does not replace it.

The release commit must be the exact commit that is tagged `v0.1.0` and published
as the corresponding GitHub Release.

## Automated gate

Run from the repository root:

```bash
npm run release:check
npm run validate
npm run test:integration
npm run test:e2e
```

CI must additionally pass:

- `npx prisma migrate deploy` against the isolated CI PostgreSQL service;
- the persisted production-mode MVP browser journey;
- `docker compose -f compose.production.yml config`;
- the production Docker build.

`npm run release:check` is intentionally a fast static guard. It verifies release
metadata and that the required CI, `/dev` isolation, and safety checks remain wired
into the repository. It does not replace the full commands above.

## Required pre-release database work

Issue #140 is a release blocker.

Before tagging 0.1.0:

- audit every pre-release Prisma migration;
- preserve required database-only constraints, indexes, triggers, and invariants;
- replace disposable development history with one audited pre-0.1.0 baseline;
- apply that baseline to a completely empty disposable PostgreSQL database;
- run the normal validation, integration, E2E, and production checks against the
  clean baseline;
- do not reset or destroy the existing development database while preparing it.

After 0.1.0 is released and persistent deployments exist, migration history becomes
normal forward-only production history and must not be casually squashed again.

## Manual MVP journey

Perform the final acceptance pass using normal production routes and persisted test
data. Do not use `/dev` scenarios as a substitute for this journey.

### Authentication and launcher

- Register/sign in with a normal account.
- Confirm `/select` loads without outer-page overflow.
- Resume a recent Character.
- Enter as Weaver through World -> Campaign selection.
- Enter as Threadwatcher where the account has spectator access.
- Create a Character through the cinematic launcher flow.
- Open Manage Characters.
- Review and accept a valid invitation.
- Confirm launcher Back/ESC/close controls have no dead ends.
- Sign out and sign back in.

### World

- Create and reopen a World.
- Confirm World overview, Entities, Timeline, Members, and Settings routes remain
  reachable according to authorization.
- Create/edit a World entity and navigate a relationship.
- Create/reopen a World timeline event.
- Verify restricted World content is not exposed to an unauthorized account.

### Campaign

- Create and reopen a Campaign in a World.
- Confirm Current Location/current focus state persists.
- Enter the Campaign as Weaver, Threadwalker, and Threadwatcher where applicable.
- Verify Threadwatcher remains read-only.
- Verify a Campaign-only user does not gain unrelated World editing access.
- Verify lifecycle/management screens still enforce owner/member permissions.

### Character hierarchy

- Create a portable Character.
- Add it to a World as a WorldCharacter.
- Attach that WorldCharacter to a Campaign.
- Verify portable, World-specific, and Campaign-specific state remain distinct.
- Leave/re-enter and confirm persisted Character state reloads.
- Confirm invalid cross-World CampaignCharacter attachment still fails closed.

### Navigation

After #165 / PR #166 is merged:

- World -> Campaign -> Character breadcrumbs navigate to the expected ancestor.
- Header context controls switch context rather than acting as the only way to
  navigate upward.
- The desktop navigation drawer opens/closes via button, backdrop, and Escape.
- The phone navigation drawer is usable without conflicting with the existing
  context selector.
- Weaver/Threadwatcher mode remains preserved while navigating derived workspace
  links.
- `/select` cinematic launcher routes do not receive the normal in-app breadcrumb
  bar.

## Responsive acceptance matrix

Check the primary launcher and in-app paths at minimum at:

- phone: approximately 390 x 844;
- tablet: approximately 820 x 1180;
- desktop: 1920 x 1080;
- large desktop: 2560 x 1440.

For each size verify:

- no unexpected horizontal overflow;
- no main-document scroll where a viewport-bound workspace is intended;
- internal scroll regions remain reachable;
- menus/drawers do not render outside the viewport;
- primary actions remain visible and usable;
- text does not clip through ornamental frames or controls.

## Production isolation

In a production build:

- `/dev` pages return unavailable/not found;
- `/api/dev/scenarios/*` returns unavailable and cannot mutate fixtures;
- deterministic scenario setup/reset/cleanup is inaccessible;
- no production path relies on `/dev` modules for normal behavior.

## Release metadata

Before tagging:

- `package.json` version is `0.1.0`;
- Git tag will be `v0.1.0`;
- release notes describe the MVP scope and known limitations;
- no post-MVP feature is advertised as part of 0.1.0;
- deployment documentation points stable users at the versioned release rather
  than the `edge` image.

## Known release blockers at checklist creation

- #165 / PR #166 — hierarchical in-app navigation polish.
- #140 — audited Prisma migration baseline.

Issue #167 owns this final sweep/checklist. Any newly discovered release-blocking
bug should receive a focused issue rather than being silently absorbed into this
checklist.

## Release decision

Tag `v0.1.0` only when:

1. #165 is accepted and merged;
2. #140 is completed and merged;
3. Issue #167's automated and manual gates are green;
4. the v0.1.0 milestone has no unresolved release blockers;
5. the exact `main` commit being released passes CI.
