# Core-flow performance benchmark

This benchmark provides a small repeatable production-mode timing set for the MVP core flow. It is intended for local or test data only.

Do not run the mutating `selection-use` case against a production database.

## Why production mode

`next dev` includes compilation, HMR, source maps, and other development-only work. First-hit development timings are therefore not a useful proxy for application latency.

For performance comparisons, build and run Weaveryn with:

```bash
npm run build
npm run start
```

Warm requests from that production-mode server are the primary comparison for Issue #56. Development timings may still be collected separately when investigating development experience.

## Benchmark command

```bash
npm run perf:core
```

The script always benchmarks `/select`. Additional cases are enabled by environment variables:

- `WEAVERYN_BENCH_WORLD_ID` — adds the WorldEntity browser.
- `WEAVERYN_BENCH_CAMPAIGN_ID` — adds Campaign navigation and scopes the WorldEntity browser to that Campaign.
- `WEAVERYN_BENCH_ENTITY_ID` — adds a representative WorldEntity detail route.
- `WEAVERYN_BENCH_SELECTION_JSON` — explicitly enables the mutating `/api/v1/selection/use` POST benchmark.

Authenticated routes require a valid local/test session Cookie header in `WEAVERYN_BENCH_COOKIE`.

Use a short-lived shell variable and avoid committing cookies or copying them into documentation or issue comments.

Example:

```bash
export WEAVERYN_BENCH_COOKIE='better-auth.session_token=...'
export WEAVERYN_BENCH_WORLD_ID='<world-uuid>'
export WEAVERYN_BENCH_CAMPAIGN_ID='<campaign-uuid>'
export WEAVERYN_BENCH_ENTITY_ID='<entity-uuid>'

npm run perf:core
```

To include entry-use timing against local/test data:

```bash
export WEAVERYN_BENCH_SELECTION_JSON='{"kind":"WEAVER","worldId":"<world-uuid>","campaignId":"<campaign-uuid>"}'
npm run perf:core
```

The selection-use benchmark updates entry recency on every measured request. Leave `WEAVERYN_BENCH_SELECTION_JSON` unset when only read-only measurements are wanted.

## Samples and output

Defaults:

- 2 warm-up requests per case.
- 10 measured requests per case.
- `http://127.0.0.1:3000` as the target server.

Optional overrides:

```bash
export WEAVERYN_BENCH_BASE_URL='http://127.0.0.1:3000'
export WEAVERYN_BENCH_WARMUPS=3
export WEAVERYN_BENCH_SAMPLES=20
export WEAVERYN_BENCH_LABEL='issue-56-after'
export WEAVERYN_BENCH_OUTPUT='/tmp/weaveryn-after.json'
```

The console output reports median, p95, average, minimum, and maximum elapsed time for each route/action. JSON output is optional so before/after results can be retained without adding generated benchmark data to the repository.

## Issue #56 before/after comparison

Use the same database fixture, session, IDs, sample count, and machine for both runs.

1. Run the benchmark against the pre-cleanup baseline revision.
2. Run it again against the Issue #56 optimization branch.
3. Compare warm median and p95 timings rather than development first-hit timing.
4. Keep authorization, visibility, and domain tests green.
5. Record broader or unrelated bottlenecks in Issue #59 rather than expanding Issue #56.

The query-count regression tests around WorldEntity service orchestration complement this route-level benchmark by asserting that known repeated repository reads do not return.

## Guardrails

- Use local/test data only.
- Never commit an authenticated cookie.
- Do not benchmark `next dev` and report it as production latency.
- Do not add indexes solely because a route feels slow; inspect real query behavior first.
- Do not weaken authorization or visibility rules for benchmark improvements.
- Keep the benchmark lightweight; broader load testing belongs in Issue #59.
