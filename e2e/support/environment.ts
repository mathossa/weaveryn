export const E2E_RUN_ID_PATTERN = /^[a-z0-9]{8,16}$/

export interface E2EEnvironment {
  databaseUrl: string
  databaseName: string
  runId: string
  marker: string
  databaseTarget: string
}

export interface E2EUserFixture {
  role: 'owner' | 'worldMember' | 'assistant' | 'outsider'
  displayName: string
  username: string
  email: string
  password: string
}

export interface E2EFixture {
  runId: string
  marker: string
  users: Record<E2EUserFixture['role'], E2EUserFixture>
  primaryWorld: { name: string; description: string }
  secondaryWorld: { name: string; description: string }
  primaryCampaign: { name: string; description: string }
  memberCampaign: { name: string; description: string }
  secondaryCampaign: { name: string; description: string }
  archivedCampaign: { name: string; description: string }
  character: { name: string }
  location: { name: string; description: string }
  organization: { name: string; description: string }
  relationship: { type: string; label: string }
  worldEvent: { title: string; description: string }
}

function databaseNameFromUrl(url: URL) {
  return decodeURIComponent(url.pathname.replace(/^\/+/, ''))
}

function isLoopbackHost(hostname: string) {
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  )
}

export function assertE2EEnvironment(
  environment: Record<string, string | undefined> = process.env,
): E2EEnvironment {
  const databaseUrl = environment.E2E_DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      'E2E_DATABASE_URL is required. The E2E suite never falls back to DATABASE_URL.',
    )
  }

  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  } catch {
    throw new Error('E2E_DATABASE_URL must be a valid PostgreSQL URL.')
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('E2E_DATABASE_URL must use PostgreSQL.')
  }

  const databaseName = databaseNameFromUrl(parsed)
  if (!/(^|[-_])test([-_]|$)/i.test(databaseName)) {
    throw new Error(
      `E2E_DATABASE_URL must target a clearly marked test database; received "${databaseName || 'missing database name'}".`,
    )
  }

  if (
    !isLoopbackHost(parsed.hostname) &&
    environment.E2E_ALLOW_REMOTE_DATABASE !== 'true'
  ) {
    throw new Error(
      'Remote E2E databases require E2E_ALLOW_REMOTE_DATABASE=true. Verify that the target is disposable before opting in.',
    )
  }

  const runId = environment.E2E_RUN_ID
  if (!runId || !E2E_RUN_ID_PATTERN.test(runId)) {
    throw new Error(
      'E2E_RUN_ID must contain 8-16 lowercase letters or numbers.',
    )
  }

  return {
    databaseUrl,
    databaseName,
    runId,
    marker: `[e2e:${runId}]`,
    databaseTarget: `${parsed.hostname}:${parsed.port || '5432'}/${databaseName}`,
  }
}

function userFixture(
  marker: string,
  runId: string,
  role: E2EUserFixture['role'],
  label: string,
): E2EUserFixture {
  const stableRole = role.toLowerCase()
  return {
    role,
    displayName: `${marker} ${label}`,
    username: `e2e_${runId}_${stableRole}`.slice(0, 30),
    email: `issue22.${runId}.${stableRole}@e2e.weaveryn.invalid`,
    password: `E2E-${runId}-Backbone!`,
  }
}

export function createE2EFixture(environment: E2EEnvironment): E2EFixture {
  const { marker, runId } = environment
  return {
    runId,
    marker,
    users: {
      owner: userFixture(marker, runId, 'owner', 'Primary Weaver'),
      worldMember: userFixture(marker, runId, 'worldMember', 'World Member'),
      assistant: userFixture(marker, runId, 'assistant', 'Assistant GM'),
      outsider: userFixture(marker, runId, 'outsider', 'Outsider'),
    },
    primaryWorld: {
      name: `${marker} Loomworld`,
      description: `${marker} primary World fixture`,
    },
    secondaryWorld: {
      name: `${marker} Farworld`,
      description: `${marker} cross-World fixture`,
    },
    primaryCampaign: {
      name: `${marker} Threadbound`,
      description: `${marker} primary Campaign fixture`,
    },
    memberCampaign: {
      name: `${marker} Member-owned`,
      description: `${marker} independently owned Campaign fixture`,
    },
    secondaryCampaign: {
      name: `${marker} Far Threads`,
      description: `${marker} valid second-World Campaign fixture`,
    },
    archivedCampaign: {
      name: `${marker} Archived Echo`,
      description: `${marker} read-only Campaign fixture`,
    },
    character: { name: `${marker} Ryn` },
    location: {
      name: `${marker} Moonwatch`,
      description: `${marker} persisted location entity`,
    },
    organization: {
      name: `${marker} Lantern Guild`,
      description: `${marker} persisted organization entity`,
    },
    relationship: {
      type: 'protects',
      label: `${marker} guards the moon gate`,
    },
    worldEvent: {
      title: `${marker} Lantern Accord`,
      description: `${marker} persisted main-timeline event`,
    },
  }
}

export async function withGuaranteedCleanup<T>(
  operation: () => Promise<T>,
  cleanup: () => Promise<void>,
) {
  try {
    return await operation()
  } finally {
    await cleanup()
  }
}
