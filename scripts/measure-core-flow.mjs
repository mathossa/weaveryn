import { writeFile } from 'node:fs/promises'

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000'
const DEFAULT_WARMUPS = 2
const DEFAULT_SAMPLES = 10

function positiveInteger(value, fallback, name) {
  if (value === undefined || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`)
  }
  return parsed
}

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1)
  return sorted[index]
}

function summarize(samples) {
  const sorted = [...samples].sort((left, right) => left - right)
  const total = sorted.reduce((sum, value) => sum + value, 0)
  return {
    samples: sorted.length,
    minMs: sorted[0] ?? 0,
    medianMs: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted.at(-1) ?? 0,
    averageMs: sorted.length > 0 ? total / sorted.length : 0,
  }
}

function formatMs(value) {
  return value.toFixed(1).padStart(8)
}

function parseSelectionBody(raw) {
  if (!raw?.trim()) return null
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('WEAVERYN_BENCH_SELECTION_JSON must contain valid JSON.')
  }
}

function benchmarkCases(environment) {
  const worldId = environment.WEAVERYN_BENCH_WORLD_ID?.trim()
  const campaignId = environment.WEAVERYN_BENCH_CAMPAIGN_ID?.trim()
  const entityId = environment.WEAVERYN_BENCH_ENTITY_ID?.trim()
  const selectionBody = parseSelectionBody(
    environment.WEAVERYN_BENCH_SELECTION_JSON,
  )

  const cases = [
    {
      name: 'select',
      method: 'GET',
      path: '/select',
    },
  ]

  if (worldId && campaignId) {
    cases.push({
      name: 'campaign',
      method: 'GET',
      path: `/world/${encodeURIComponent(worldId)}/campaign/${encodeURIComponent(campaignId)}`,
    })
  }

  if (worldId) {
    const campaignQuery = campaignId
      ? `?campaign=${encodeURIComponent(campaignId)}`
      : ''
    cases.push({
      name: 'world-entities',
      method: 'GET',
      path: `/world/${encodeURIComponent(worldId)}/entities${campaignQuery}`,
    })
  }

  if (worldId && entityId) {
    const campaignQuery = campaignId
      ? `?campaign=${encodeURIComponent(campaignId)}`
      : ''
    cases.push({
      name: 'world-entity-detail',
      method: 'GET',
      path: `/world/${encodeURIComponent(worldId)}/entities/${encodeURIComponent(entityId)}${campaignQuery}`,
    })
  }

  if (selectionBody) {
    cases.push({
      name: 'selection-use',
      method: 'POST',
      path: '/api/v1/selection/use',
      body: selectionBody,
    })
  }

  return cases
}

async function measureRequest(baseUrl, cookie, benchmarkCase) {
  const headers = {
    accept:
      benchmarkCase.method === 'GET'
        ? 'text/html,application/xhtml+xml'
        : 'application/json',
    'cache-control': 'no-cache',
  }
  if (cookie) headers.cookie = cookie
  if (benchmarkCase.body) headers['content-type'] = 'application/json'

  const startedAt = performance.now()
  const response = await fetch(new URL(benchmarkCase.path, baseUrl), {
    method: benchmarkCase.method,
    headers,
    body: benchmarkCase.body
      ? JSON.stringify(benchmarkCase.body)
      : undefined,
    redirect: 'manual',
  })
  await response.arrayBuffer()
  const durationMs = performance.now() - startedAt

  if (response.status < 200 || response.status >= 300) {
    const location = response.headers.get('location')
    throw new Error(
      `${benchmarkCase.name} returned HTTP ${response.status}${location ? ` -> ${location}` : ''}. Check the benchmark cookie and IDs.`,
    )
  }

  return { durationMs, status: response.status }
}

async function benchmarkCase(input) {
  for (let index = 0; index < input.warmups; index += 1) {
    await measureRequest(input.baseUrl, input.cookie, input.benchmarkCase)
  }

  const durations = []
  let status = 0
  for (let index = 0; index < input.samples; index += 1) {
    const measurement = await measureRequest(
      input.baseUrl,
      input.cookie,
      input.benchmarkCase,
    )
    durations.push(measurement.durationMs)
    status = measurement.status
  }

  return {
    name: input.benchmarkCase.name,
    method: input.benchmarkCase.method,
    path: input.benchmarkCase.path,
    status,
    ...summarize(durations),
  }
}

function printHelp() {
  console.log(`Weaveryn core-flow production benchmark

Run against a local/test production build, not a production database.

Environment variables:
  WEAVERYN_BENCH_BASE_URL        Server URL (default ${DEFAULT_BASE_URL})
  WEAVERYN_BENCH_COOKIE          Authenticated Cookie header value
  WEAVERYN_BENCH_WORLD_ID        Enables WorldEntity benchmark routes
  WEAVERYN_BENCH_CAMPAIGN_ID     Enables Campaign benchmark/context
  WEAVERYN_BENCH_ENTITY_ID       Optionally enables entity-detail benchmark
  WEAVERYN_BENCH_SELECTION_JSON  Opt-in POST body for /api/v1/selection/use
  WEAVERYN_BENCH_WARMUPS         Warm requests before measurement (default ${DEFAULT_WARMUPS})
  WEAVERYN_BENCH_SAMPLES         Measured requests per case (default ${DEFAULT_SAMPLES})
  WEAVERYN_BENCH_LABEL           Label stored in JSON output
  WEAVERYN_BENCH_OUTPUT          Optional JSON output path

Example selection payload:
  {"kind":"WEAVER","worldId":"<uuid>","campaignId":"<uuid>"}
`)
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp()
    return
  }

  const baseUrl = process.env.WEAVERYN_BENCH_BASE_URL ?? DEFAULT_BASE_URL
  const cookie = process.env.WEAVERYN_BENCH_COOKIE?.trim() ?? ''
  const warmups = positiveInteger(
    process.env.WEAVERYN_BENCH_WARMUPS,
    DEFAULT_WARMUPS,
    'WEAVERYN_BENCH_WARMUPS',
  )
  const samples = positiveInteger(
    process.env.WEAVERYN_BENCH_SAMPLES,
    DEFAULT_SAMPLES,
    'WEAVERYN_BENCH_SAMPLES',
  )
  const cases = benchmarkCases(process.env)

  console.log(`Benchmarking ${baseUrl}`)
  console.log(`Warmups: ${warmups}; samples: ${samples}`)
  if (!cookie) {
    console.log(
      'No WEAVERYN_BENCH_COOKIE supplied; authenticated routes may redirect.',
    )
  }
  if (!process.env.WEAVERYN_BENCH_SELECTION_JSON) {
    console.log('selection-use skipped (no mutating payload supplied).')
  }
  console.log('')

  const results = []
  for (const currentCase of cases) {
    const result = await benchmarkCase({
      baseUrl,
      cookie,
      warmups,
      samples,
      benchmarkCase: currentCase,
    })
    results.push(result)
  }

  console.log(
    'case'.padEnd(22) +
      'median'.padStart(9) +
      'p95'.padStart(9) +
      'avg'.padStart(9) +
      'min'.padStart(9) +
      'max'.padStart(9),
  )
  for (const result of results) {
    console.log(
      result.name.padEnd(22) +
        formatMs(result.medianMs) +
        formatMs(result.p95Ms) +
        formatMs(result.averageMs) +
        formatMs(result.minMs) +
        formatMs(result.maxMs),
    )
  }

  const output = {
    label: process.env.WEAVERYN_BENCH_LABEL?.trim() || null,
    measuredAt: new Date().toISOString(),
    baseUrl,
    warmups,
    samples,
    results,
  }

  const outputPath = process.env.WEAVERYN_BENCH_OUTPUT?.trim()
  if (outputPath) {
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
    console.log(`\nWrote ${outputPath}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
