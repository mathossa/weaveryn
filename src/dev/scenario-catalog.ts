export type DevScenarioAvailability = 'available' | 'planned' | 'blocked'

export interface DevScenarioMetadata {
  id: string
  title: string
  domain: string
  purpose: string
  href: string
  issueNumbers: number[]
  prerequisites: string[]
  availability: DevScenarioAvailability
  fixtureNamespace: string
}

export const devScenarioCatalog = [
  {
    id: 'world-ownership-transfer',
    title: 'World ownership transfer',
    domain: 'Worlds',
    purpose:
      'Exercise ownership transfer, authorization, membership outcomes, and transaction rollback through the real World ownership service.',
    href: '/dev/world-ownership-transfer',
    issueNumbers: [12, 34],
    prerequisites: ['Dedicated development database', 'Applied Prisma migrations'],
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
    prerequisites: ['Dedicated development database', 'Applied Prisma migrations'],
    availability: 'available',
    fixtureNamespace: 'dev:world-update-example:v1',
  },
] as const satisfies readonly DevScenarioMetadata[]

export type DevScenarioId = (typeof devScenarioCatalog)[number]['id']

export function getDevScenarioMetadata(id: string) {
  return devScenarioCatalog.find((scenario) => scenario.id === id)
}
