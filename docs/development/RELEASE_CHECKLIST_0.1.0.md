# Weaveryn 0.1.0 release checklist

This checklist is the final release-readiness matrix for the first Weaveryn MVP. It supplements the general policy in `RELEASES.md`; it does not replace it.

The release commit must be the exact commit that is tagged `v0.1.0` and published as the corresponding GitHub Release.

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

`npm run release:check` is intentionally a fast static guard. It verifies release metadata and that the required CI, `/dev` isolation, and safety checks remain wired into the repository. It does not replace the full commands above.

## Required pre-release database work

Issue #140 / PR #174 is complete and merged. The audited `0.1.0` baseline is now the release database boundary.

Before tagging 0.1.0:

- confirm the repository still contains only the audited pre-0.1.0 baseline migration;
- apply that baseline to a completely empty disposable PostgreSQL database;
- confirm the database-only constraints documented in `PRISMA_BASELINE_0.1.0.md` exist after migration;
- run the normal validation, integration, E2E, and production checks against the clean baseline;
- do not reset or destroy an existing development database while validating the baseline.

After 0.1.0 is released and persistent deployments exist, migration history becomes normal forward-only production history and must not be casually squashed again.

## Manual MVP journey

Perform the final acceptance pass using normal production routes and persisted test data. Do not use `/dev` scenarios as a substitute for this journey.

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
- Confirm World overview, Entities, Timeline, Members, and Settings routes remain reachable according to authorization.
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

Issue #165 / PR #166 is complete and merged. Validate the resulting in-app navigation rather than the superseded breadcrumb prototype:

- the Navigate hamburger is integrated into the existing authenticated header;
- opening navigation above 1024px pushes the workspace inward; at 1024px and below it overlays the workspace without compressing content;
- desktop push navigation has no backdrop; narrow overlay navigation has a dismissible backdrop;
- World, Campaign, and Character destination groups remain in a stable order as context changes;
- destinations that are unavailable in the current context remain in place as disabled entries rather than reshuffling the menu;
- the same hamburger and Escape close the rail;
- the rail remains within the viewport and scrolls internally where needed;
- compatible World-level navigation preserves entered Campaign/Character context without granting additional authorization;
- Weaver/Threadwatcher mode remains preserved while navigating derived workspace links;
- `Return to the Weave` explicitly leaves the current entry context and returns to `/select`;
- `/select` cinematic launcher routes do not receive the normal in-app navigation control or rail.

## Responsive acceptance matrix

Check the primary launcher and in-app paths at minimum at:

- phone: approximately 390 x 844;
- tablet: approximately 820 x 1180;
- desktop: 1920 x 1080;
- large desktop: 2560 x 1440.

For each size verify:

- no unexpected horizontal overflow;
- no main-document scroll where a viewport-bound workspace is intended;
- AppShell content and internal scroll regions remain reachable;
- Campaign Advanced End and Delete confirmations remain fully reachable both separately and together;
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
- deployment documentation points stable users at the versioned release rather than the `edge` image.

## Completed release blockers

- [x] #165 / PR #166 — hierarchical in-app navigation polish.
- [x] #140 / PR #174 — audited Prisma migration baseline.

Issue #167 owns this final sweep/checklist. Any newly discovered release-blocking bug should receive a focused issue rather than being silently absorbed into this checklist.

## Release decision

Tag `v0.1.0` only when:

1. #165 / PR #166 is accepted and merged;
2. #140 / PR #174 is completed and merged;
3. Issue #167's automated and manual gates are green;
4. the v0.1.0 milestone has no unresolved release blockers;
5. the exact `main` commit being released passes CI.
