# Visual Acceptance Testing

Weaveryn has one reusable development-only test hub at `/dev`. Feature issues
add scenarios to that hub; they do not create a new dashboard or database for
each issue. Registered older scenarios remain available and rerunnable until
their underlying feature is deliberately removed.

Visual scenarios supplement automated tests. They are useful for inspecting
persisted before/after state and manually exercising a real application service,
but they do not replace unit, integration, or future end-to-end coverage.

## Safety boundary

The hub and every scenario API return `404` when `NODE_ENV=production`.
Outside production, the shared API still refuses all scenario reads and writes
unless:

1. `DEV_DATABASE_NAME` is clearly marked as a development or test database;
2. the database name parsed from `DATABASE_URL` exactly matches it; and
3. the requested scenario and action are registered and server-validated.

The default expected database is `weaveryn_dev`. Only the database name is
shown in the hub; connection credentials are never returned to the browser.

The original issue #12 ownership lab did **not** guarantee a separate database:
it used whichever database `DATABASE_URL` selected, while Docker Compose created
`weaveryn`. Issue #34 changes Compose to `weaveryn_dev` and adds the shared
server-side database-name guard.

## Scenario lifecycle

Every scenario follows the same lifecycle:

1. **Create/reset fixture** creates the same namespaced starting state every time.
2. **Manual action** calls a real application service with a fixed set of actors,
   roles, targets, and parameters.
3. **Run all checks** executes the scenario's live acceptance criteria and reports
   passed, failed, pending/manual, or infrastructure-error outcomes.
4. **Inspect** shows the acting user, target, expected result, actual result,
   domain error code, and persisted before/after state.
5. **Cleanup scenario data** removes only records carrying that scenario's fixed
   IDs and ownership marker. Referenced fixture users are retained and reported.

Reset and cleanup must never truncate tables, apply migrations, accept arbitrary
record IDs, or delete records that cannot be proven to belong to the scenario.
Direct Prisma use is limited to fixture setup/reset, inspection, and cleanup.
All user-testable behavior calls the same application services as the product.

## Cleanup rule for temporary databases and entries

The normal workflow uses the shared `weaveryn_dev` database and creates only
scenario-owned entries. Use the dashboard cleanup button after a scenario no
longer needs to be inspected.

If a script or future test runner creates a temporary database instead, the
creator must:

- give it a clear `dev` or `test` name plus a run/issue namespace;
- record ownership in that test run rather than discovering databases by a broad
  wildcard;
- drop exactly that database on success and failure, normally in a `finally` or
  teardown hook; and
- report a failed drop so the developer can remove the named database manually.

The dashboard cleanup button removes scenario-owned **entries**. It never drops
the shared development database. A scenario must not create a database per issue
unless database-level isolation is itself the subject of the test.

## Adding a scenario

1. Add metadata to `src/dev/scenario-catalog.ts`. IDs, routes, and fixture
   namespaces must be unique.
2. Implement the shared `DevScenario` contract under
   `src/server/dev-scenarios/`. Register it in the server registry.
3. Use deterministic UUIDs and marker values. Before reset or cleanup, verify all
   matching IDs and unique user fields still belong to the scenario.
4. Validate every custom action exactly. Do not accept arbitrary record IDs,
   Prisma operations, SQL, actor IDs, or roles from the browser.
5. Call existing application/domain services for feature behavior. Keep direct
   Prisma access inside the fixture lifecycle and inspection helpers.
6. Add a scenario page under `/dev` using the shared lifecycle hook and result
   components. A specialized visualization is welcome when it helps inspect the
   domain state.
7. Cover production/database guards, request validation, fixture isolation,
   cleanup, and scenario-specific behavior with automated tests.
8. Run tests, ESLint, TypeScript, Prisma validation/generation when applicable,
   and a production build.

The `world-update-example` scenario is the minimal reference implementation. The
issue #12 ownership-transfer scenario remains the richer reference for multiple
actors, domain errors, transaction rollback, and eight live checks.

## Feature issue checklist

Copy this section into future feature implementation issues:

- [ ] User-testable or domain behavior has a registered visual scenario, or the
      issue explains why a visual scenario is not applicable.
- [ ] Scenario ID, fixture IDs, user identifiers, and marker are deterministic
      and namespaced.
- [ ] Setup/reset produces the same state repeatedly.
- [ ] Manual actions call real application services.
- [ ] Actors, roles, actions, and targets are server-validated allowlists.
- [ ] Important before/after state, expected/actual outcome, and domain error code
      are visible.
- [ ] Executable criteria are available through **Run all checks**; manual-only
      criteria are explicitly labeled.
- [ ] Cleanup removes only scenario-owned disposable entries and reports anything
      intentionally retained.
- [ ] Production and unsafe-database access cannot read or mutate scenario data.
- [ ] Relevant automated tests and project validation pass.
