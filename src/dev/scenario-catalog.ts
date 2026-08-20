export type DevScenarioAvailability = 'available' | 'planned' | 'blocked'

export interface DevScenarioMetadata {
  id: string
  title: string
  domain: string
  purpose: string
  href: string
  issueNumbers: readonly number[]
  prerequisites: readonly string[]
  availability: DevScenarioAvailability
  fixtureNamespace: string
}

export const devScenarioCatalog = [
  {
    id: 'auth-account-lifecycle',
    title: 'Authentication and account lifecycle',
    domain: 'Users',
    purpose:
      'Exercise real Better Auth registration with required public username, database sessions, logout, authenticated User resolution, deletion blockers, and World orphaning.',
    href: '/dev/auth-account-lifecycle',
    issueNumbers: [14, 57],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
      'BETTER_AUTH_SECRET and BETTER_AUTH_URL configured',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:auth-account-lifecycle:v1',
  },
  {
    id: 'character-copy-migration',
    title: 'WorldCharacter copy, migration, and entity graph',
    domain: 'Characters',
    purpose:
      'Exercise explicit target data, duplicate protection, Campaign participation blocking, Character-backed WorldEntity creation, relationship-safe source NPC preservation, and migration through the real Character service.',
    href: '/dev/character-copy-migration',
    issueNumbers: [19, 117],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:character-copy-migration:v1',
  },
  {
    id: 'campaign-characters',
    title: 'CampaignCharacter participation and state',
    domain: 'Campaigns',
    purpose:
      'Exercise same-World Character participation, independent Campaign state, authorization, Character-owner self-removal, and participation-only removal through the real CampaignCharacter service.',
    href: '/dev/campaign-characters',
    issueNumbers: [18, 124],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:campaign-characters:v1',
  },
  {
    id: 'orphaned-world-lifecycle',
    title: 'Orphaned World lifecycle',
    domain: 'Worlds',
    purpose:
      'Exercise World relinquishment, eligible orphan claims, Campaign-owner eligibility, and guarded cleanup through the real lifecycle service.',
    href: '/dev/orphaned-world-lifecycle',
    issueNumbers: [13],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:orphaned-world-lifecycle:v1',
  },
  {
    id: 'character-world-character-foundation',
    title: 'Character and WorldCharacter foundation',
    domain: 'Characters',
    purpose:
      'Exercise portable Character ownership and World-specific incarnations through the real Character service.',
    href: '/dev/character-world-character-foundation',
    issueNumbers: [17],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:character-world-character-foundation:v1',
  },
  {
    id: 'character-entry-flow',
    title: 'Invited player Character entry flow',
    domain: 'Characters',
    purpose:
      'Exercise Campaign-only WorldCharacter creation and PLAYER self-service CampaignCharacter attachment without granting general World edit permission.',
    href: '/dev/character-entry-flow',
    issueNumbers: [54],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:character-entry-flow:v1',
  },
  {
    id: 'choose-entity-entry',
    title: 'Choose Entity entry preferences',
    domain: 'Selection',
    purpose:
      'Exercise Campaign-specific Character entry cards, per-entry pinning, recent-use tracking, Weaver resume context, and Threadwatcher World → Campaign selection with membership-scoped Campaign visibility through the real selection services.',
    href: '/dev/choose-entity-entry',
    issueNumbers: [51, 108],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:choose-entity-entry:v1',
  },
  {
    id: 'world-entities',
    title: 'World entities and relationships',
    domain: 'Worlds',
    purpose:
      'Exercise generic World entities, simple structured data, reusable custom types, MVP visibility, explicit relationships, same-World validation, and backend authorization through the real World entity service.',
    href: '/dev/world-entities',
    issueNumbers: [20, 55],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:world-entities:v1',
  },
  {
    id: 'campaign-memberships',
    title: 'Campaign memberships and roles',
    domain: 'Campaigns',
    purpose:
      'Exercise owner-managed Campaign roles, owner GM protection, duplicate rejection, member access, and authorization through the real membership service.',
    href: '/dev/campaign-memberships',
    issueNumbers: [16],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:campaign-memberships:v1',
  },
  {
    id: 'campaign-foundation',
    title: 'Campaign foundation',
    domain: 'Campaigns',
    purpose:
      'Exercise Campaign creation, loading, updating, World authorization, main-timeline context, and independent ownership through the real Campaign service.',
    href: '/dev/campaign-foundation',
    issueNumbers: [15],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:campaign-foundation:v1',
  },
  {
    id: 'world-ownership-transfer',
    title: 'World ownership transfer',
    domain: 'Worlds',
    purpose:
      'Exercise ownership transfer, authorization, membership outcomes, and transaction rollback through the real World ownership service.',
    href: '/dev/world-ownership-transfer',
    issueNumbers: [12, 34],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:world-ownership-transfer:v1',
  },
  {
    id: 'world-update-example',
    title: 'World update contract example',
    domain: 'Worlds',
    purpose:
      'Demonstrate how another scenario reuses the shared guards, lifecycle, response envelope, acceptance reporting, and cleanup plumbing.',
    href: '/dev/world-update-example',
    issueNumbers: [34],
    prerequisites: [
      'Dedicated development database',
      'Applied Prisma migrations',
    ],
    availability: 'available',
    fixtureNamespace: 'dev:world-update-example:v1',
  },
] as const satisfies readonly DevScenarioMetadata[]

export type DevScenarioId = (typeof devScenarioCatalog)[number]['id']

export function getDevScenarioMetadata(id: string) {
  return devScenarioCatalog.find((scenario) => scenario.id === id)
}

export function requireDevScenarioMetadata(id: DevScenarioId) {
  const metadata = getDevScenarioMetadata(id)

  if (!metadata) {
    throw new Error(`Development scenario metadata is missing for ${id}.`)
  }

  return metadata
}
