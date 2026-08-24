import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

function fail(message) {
  console.error(`E2E configuration error: ${message}`)
  process.exit(1)
}

function executable(name) {
  return path.join(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? `${name}.cmd` : name,
  )
}

function run(command, args, environment) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  return result.status ?? 1
}

function parseOptions(argumentsList) {
  const options = { runs: 1, headed: false, skipBuild: false }
  for (const argument of argumentsList) {
    if (argument === '--headed') options.headed = true
    else if (argument === '--skip-build') options.skipBuild = true
    else if (argument.startsWith('--runs=')) {
      options.runs = Number(argument.slice('--runs='.length))
    } else {
      fail(`unknown argument "${argument}".`)
    }
  }
  if (
    !Number.isInteger(options.runs) ||
    options.runs < 1 ||
    options.runs > 10
  ) {
    fail('--runs must be an integer from 1 to 10.')
  }
  return options
}

const options = parseOptions(process.argv.slice(2))
const databaseUrl = process.env.E2E_DATABASE_URL
if (!databaseUrl) {
  fail(
    'E2E_DATABASE_URL is required; DATABASE_URL is never used as a fallback.',
  )
}

let parsedDatabaseUrl
try {
  parsedDatabaseUrl = new URL(databaseUrl)
} catch {
  fail('E2E_DATABASE_URL must be a valid PostgreSQL URL.')
}
if (
  parsedDatabaseUrl.protocol !== 'postgresql:' &&
  parsedDatabaseUrl.protocol !== 'postgres:'
) {
  fail('E2E_DATABASE_URL must use PostgreSQL.')
}
const databaseName = decodeURIComponent(
  parsedDatabaseUrl.pathname.replace(/^\/+/, ''),
)
if (!/(^|[-_])test([-_]|$)/i.test(databaseName)) {
  fail(`database "${databaseName || 'missing'}" is not clearly marked test.`)
}
const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1'])
if (
  !loopbackHosts.has(parsedDatabaseUrl.hostname) &&
  process.env.E2E_ALLOW_REMOTE_DATABASE !== 'true'
) {
  fail(
    'remote databases require E2E_ALLOW_REMOTE_DATABASE=true after verifying the target is disposable.',
  )
}
if (options.runs > 1 && process.env.E2E_RUN_ID) {
  fail('do not set E2E_RUN_ID when using --runs more than once.')
}

const sharedEnvironment = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DEV_DATABASE_NAME: databaseName,
  E2E_DATABASE_NAME: databaseName,
  BETTER_AUTH_SECRET:
    process.env.E2E_BETTER_AUTH_SECRET ?? randomBytes(32).toString('base64url'),
  BETTER_AUTH_URL: 'http://127.0.0.1:3000',
}
const sanitizedTarget = `${parsedDatabaseUrl.hostname}:${parsedDatabaseUrl.port || '5432'}/${databaseName}`
console.log(`E2E database: ${sanitizedTarget}`)

if (run(executable('prisma'), ['migrate', 'deploy'], sharedEnvironment) !== 0) {
  process.exit(1)
}
if (
  !options.skipBuild &&
  run(executable('next'), ['build'], sharedEnvironment) !== 0
) {
  process.exit(1)
}

for (let runNumber = 1; runNumber <= options.runs; runNumber += 1) {
  const runId =
    process.env.E2E_RUN_ID ?? randomBytes(5).toString('hex').toLowerCase()
  console.log(`E2E run ${runNumber}/${options.runs}: ${runId}`)
  const playwrightArguments = ['test']
  if (options.headed) playwrightArguments.push('--headed')
  const status = run(executable('playwright'), playwrightArguments, {
    ...sharedEnvironment,
    E2E_RUN_ID: runId,
  })
  if (status !== 0) process.exit(status)
}
