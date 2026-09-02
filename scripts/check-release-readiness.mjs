import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const expectedVersion = process.env.WEAVERYN_RELEASE_VERSION ?? '0.1.0'

async function read(path) {
  return readFile(resolve(root, path), 'utf8')
}

function check(condition, message) {
  if (!condition) throw new Error(message)
  console.log(`✓ ${message}`)
}

function includesAll(content, snippets, label) {
  for (const snippet of snippets) {
    check(content.includes(snippet), `${label}: ${snippet}`)
  }
}

async function main() {
  const [packageText, ci, releases, devPage, devHandler] = await Promise.all([
    read('package.json'),
    read('.github/workflows/ci.yml'),
    read('docs/development/RELEASES.md'),
    read('src/app/dev/page.tsx'),
    read('src/server/dev-scenarios/handler.ts'),
  ])

  const packageJson = JSON.parse(packageText)

  check(
    packageJson.version === expectedVersion,
    `package.json version is ${expectedVersion}`,
  )

  const requiredScripts = [
    'validate',
    'test:integration',
    'test:e2e',
    'prisma:validate',
    'prisma:generate',
  ]
  for (const script of requiredScripts) {
    check(Boolean(packageJson.scripts?.[script]), `npm script exists: ${script}`)
  }

  includesAll(
    ci,
    [
      'npx prisma migrate deploy',
      'npm run validate',
      'npm run test:integration',
      'npm run test:e2e -- --skip-build',
      'docker compose -f compose.production.yml config',
      'docker build --tag weaveryn:ci .',
    ],
    'CI release gate contains',
  )

  includesAll(
    releases,
    [
      '0.1.0` is the first MVP release',
      'release commit should satisfy',
      'production build success',
      'required database migrations and upgrade behavior',
      'production isolation of `/dev`',
    ],
    'release policy contains',
  )

  includesAll(
    devPage,
    ["process.env.NODE_ENV === 'production'", 'notFound()'],
    'development page production guard contains',
  )

  includesAll(
    devHandler,
    [
      'isProductionEnvironment(environment)',
      'return unavailableResponse()',
      'assertSafeDevEnvironment(environment)',
    ],
    'development API production/safety guard contains',
  )

  console.log(`\nWeaveryn ${expectedVersion} static release-readiness checks passed.`)
  console.log(
    'Run npm run validate, npm run test:integration, npm run test:e2e, and the container CI checks before tagging.',
  )
}

main().catch((error) => {
  console.error(`Release-readiness check failed: ${error.message}`)
  process.exitCode = 1
})
