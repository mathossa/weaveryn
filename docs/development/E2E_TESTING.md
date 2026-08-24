# End-to-end MVP backbone testing

Issue #22 adds browser coverage for the persisted MVP backbone. This suite
complements the existing unit, PostgreSQL integration, and `/dev` scenario
coverage; it does not replace those layers or introduce new domain behavior.

## Initial coverage audit

| Area                                 | Coverage before Issue #22                                                                                                                           | Browser-journey gap / disposition                                                                                                                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration and sign-in             | Sufficient real Better Auth + Prisma integration coverage, including username policy, password hashing, invalid credentials, and session creation   | Missing production login form, cookie, and return-route coverage                                                                                                                                                    |
| Persisted sessions and sign-out      | Covered at authentication integration level                                                                                                         | Missing browser reload, new browser context, UI sign-out/sign-in, and application restart evidence                                                                                                                  |
| Account lifecycle                    | Service tests cover guarded deletion, World orphaning, and auth-row cleanup                                                                         | Full account deletion is intentionally unsuitable for the backbone browser journey because owned Campaign/Character resolution is a separate destructive workflow; fixture-user removal belongs to guarded teardown |
| World creation and loading           | Service tests cover owner authority, main timeline creation, access paths, updates, and World UI projections                                        | Missing production form/API creation followed by deep-link reload and restored-session loading                                                                                                                      |
| World membership and invitations     | Service and `/dev` coverage includes roles, invitation authority, acceptance, reuse/expiry, and campaign-only distinctions                          | Missing a multi-user production invitation journey and route-level authorization probes                                                                                                                             |
| Campaign creation and loading        | Service/integration coverage includes independent ownership, main timeline selection, management permissions, and UI projections                    | Missing production creation, dashboard/management navigation, reload, and restart evidence                                                                                                                          |
| Campaign ownership and membership    | Service/integration coverage is strong for owner/GM/Assistant GM/player/spectator boundaries, transfer, and lifecycle                               | Missing one persisted browser/API journey that proves World membership does not imply Campaign access and Campaign membership remains independent                                                                   |
| Character creation                   | Service and Character UI integration coverage includes portable ownership and chooser projection                                                    | Missing production Character form and restored-session navigation                                                                                                                                                   |
| WorldCharacter creation/copying      | Service/integration coverage includes one-per-World, multiple-World incarnations, graph identity, copy/migration, and authorization                 | Missing production incarnation creation in two Worlds and persisted identifier evidence in the complete journey                                                                                                     |
| CampaignCharacter participation      | Service tests cover independent state, self-attachment, GM/Assistant GM management, duplicate/cross-World rejection, and archived reads             | Missing production participation attachment plus crafted cross-World API rejection with persisted rollback inspection                                                                                               |
| World entities                       | Unit/integration coverage includes CRUD, all MVP visibility scopes, custom types, Character-backed identities, and atomic initial relationships     | Missing production form creation and browser navigation in the complete journey                                                                                                                                     |
| Entity relationships                 | Service/integration coverage includes same-World validation, visibility, atomic creation, and deletion behavior                                     | Missing relationship link navigation, deep-link reload, and persisted identifier evidence                                                                                                                           |
| Selection and context persistence    | Integration/unit coverage includes authorized choices, pin/recent-use/resume persistence, and context URL construction                              | Missing production `/select` rendering and state recovery after sign-in/restart                                                                                                                                     |
| Deep links and browser reloads       | Route helpers and server projection tests cover component inputs                                                                                    | Missing real-browser coverage                                                                                                                                                                                       |
| Cross-World invariants               | Service test rejects CampaignCharacter cross-World writes before repository creation; Character tests cover portable incarnations across Worlds     | Missing a real PostgreSQL/API assertion that no partial CampaignCharacter row remains and a valid same-World write still succeeds afterward                                                                         |
| Unauthorized access                  | Service and UI-projection tests cover fail-closed access predicates and role boundaries                                                             | Missing protected UI deep links and direct production API response assertions for World, Campaign, Character, and entity resources                                                                                  |
| Archived/read-only Campaign behavior | Service and integration tests cover lifecycle persistence and read-only mutations; management structure tests keep destructive controls on Advanced | Broad archived browser mutation coverage would duplicate authoritative service tests; the E2E suite adds a focused production API/read-only and management-route smoke check                                        |
| Responsive/accessibility behavior    | Deterministic `/dev` scenarios and prior manual visual checks exist                                                                                 | Missing automated phone, tablet, 1920x1080, and 2560x1440 smoke checks, focus checks, overflow checks, and compact artifacts                                                                                        |
| Cleanup safety                       | `/dev` fixture ownership guards and namespaced integration cleanup exist                                                                            | Missing an E2E-specific mandatory test-database guard, ownership validation, failure-safe/idempotent cleanup, and rerun proof                                                                                       |

The browser suite therefore focuses on the missing cross-layer evidence. Existing
service/integration tests remain authoritative for exhaustive role permutations,
account deletion, invitation expiry, Campaign lifecycle transitions, Character
migration, and all visibility-scope combinations.

## Boundary and prerequisites

The suite uses Playwright with Chromium against `next start`, the real Better Auth
session implementation, and a migrated PostgreSQL database. It starts the
production server on an available loopback port and restarts that same server
during the journey. Normal state is created through production forms and APIs;
Prisma is used only to inspect persisted invariants and perform guarded cleanup.

Before running locally:

1. Install the repository dependencies with `npm ci`.
2. Make a dedicated disposable PostgreSQL database whose name contains `test` as
   a delimited word, for example `weaveryn_e2e_test`.
3. Install Chromium once with `npx playwright install chromium`.

The runner applies committed migrations. It builds the production application by
default, so no separately started development server is required.

## Environment and commands

`E2E_DATABASE_URL` is required and must be a PostgreSQL URL for the disposable
test database. The runner deliberately never falls back to `DATABASE_URL`.
Loopback databases are accepted by default. A remote disposable test database
also requires `E2E_ALLOW_REMOTE_DATABASE=true`; set that only after independently
confirming the target is safe to destroy fixture data in.

```bash
E2E_DATABASE_URL=postgresql://weaveryn:password@127.0.0.1:5432/weaveryn_e2e_test \
  npm run test:e2e
```

Useful variants:

```bash
# Reuse an already current production build.
E2E_DATABASE_URL=... npm run test:e2e -- --skip-build

# Prove independent namespaces and cleanup twice in one invocation.
E2E_DATABASE_URL=... npm run test:e2e -- --skip-build --runs=2

# Observe Chromium locally.
E2E_DATABASE_URL=... npm run test:e2e -- --headed
```

`E2E_RUN_ID` may be set to an 8-16 character lowercase alphanumeric identifier
for a single diagnostic run. Do not set it with `--runs`; repeated runs must use
fresh namespaces. `E2E_BETTER_AUTH_SECRET` is optional and otherwise generated
per runner invocation.

The command fails early for a missing URL, a database name not clearly marked as
test, an unapproved remote host, unavailable migrations/build/browser, or a
server that does not become ready. It never resets or recreates a database.

## Journey and created fixtures

Each run receives a random marker such as `[e2e:1a2b3c4d]`. The journey creates
three real auth accounts (owner, ordinary World member, and Assistant GM), two
Worlds, four Campaigns (primary, member-owned, second-World, and archived), one
portable Character with two WorldCharacter incarnations, two valid
CampaignCharacter records, two ordinary World entities, their relationship, a
main-timeline event, invitations, sessions, and entry preferences.

It covers registration, invalid and valid sign-in, sign-out, World/Campaign/
Character/entity creation and navigation, invitation acceptance and reuse,
independent World and Campaign ownership/membership, fail-closed UI and API
access, a crafted cross-World participation rejection with database rollback
inspection, archived Campaign read-only behavior, deep-link reloads, a fresh
browser session, sign-in return, and an actual application-server restart.

Representative phone (390x844), tablet (820x1180), desktop (1920x1080), and wide
desktop (2560x1440) checkpoints assert reachable navigation, absence of horizontal
overflow, in-viewport dialogs, usable keyboard focus, management hierarchy, and
the separation between the non-destructive management hub and Advanced actions.

## Cleanup safety

Cleanup runs before and after the journey and from `afterAll`, including when an
assertion fails. It discovers only the exact run namespace, then validates names,
descriptions, auth identities, ownership, World scope, and cross-record links
before deleting anything. Any foreign or ambiguous record causes an ownership
violation instead of deletion. Deleting the three fixture users removes their
sessions and auth accounts through the schema's referential actions; the remaining
fixture graph is removed in dependency order. A second cleanup pass verifies that
no run marker remains, making teardown idempotent.

Every run prints a cleanup report with counts and a `retained` list. The expected
successful result is `retained: []`. A non-empty list or ownership violation is a
test failure: preserve the output, inspect the named records in the explicitly
configured test database, and do not broaden cleanup predicates to make the run
pass. Correct the marker/ownership mismatch or remove deliberately retained data
manually only after verifying each identifier.

## Failure artifacts and diagnosis

The line reporter is shown in the terminal. Playwright also writes an HTML report
to `playwright-report/` and per-test screenshots, the production-server log,
video, and a trace to `test-results/playwright/` on failure. CI uploads both
directories only when the E2E step fails. Open a local trace with the command
printed by Playwright, or run `npx playwright show-report playwright-report`.

Authentication throttling returns `X-Retry-After`; the sign-in helper honors one
real rate-limit response rather than sleeping speculatively. The suite has one
worker and no retries. Diagnose an observable timeout or domain response instead
of adding arbitrary waits or retrying a failed journey.

The cleanup contract itself has unit coverage for explicit database guards,
remote opt-in, stable marker identities, and cleanup execution after an
intentional failure. Use `npm test -- --run e2e/support/environment.test.ts` for
that focused check.
