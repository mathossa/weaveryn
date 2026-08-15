import { invalidWorldRole } from './world-errors'

export const WORLD_ROLES = ['ADMIN', 'MEMBER', 'VIEWER'] as const

export type WorldRole = (typeof WORLD_ROLES)[number]

const worldRoles = new Set<string>(WORLD_ROLES)

export function isWorldRole(value: unknown): value is WorldRole {
  return typeof value === 'string' && worldRoles.has(value)
}

export function assertWorldRole(value: unknown): asserts value is WorldRole {
  if (!isWorldRole(value)) {
    throw invalidWorldRole(value)
  }
}
