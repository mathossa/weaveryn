export type AuthAccountLifecycleAction =
  | { action: 'seed-world' }
  | { action: 'seed-character' }
  | { action: 'resolve-character' }

export interface AuthAccountLifecycleState {
  user: {
    id: string
    email: string
    username: string
    displayName: string | null
  } | null
  auth: {
    credentialAccountCount: number
    sessionCount: number
  }
  ownedWorld: {
    id: string
    ownerId: string | null
  } | null
  ownedCharacter: {
    id: string
    ownerUserId: string
  } | null
}

const actions = new Set<AuthAccountLifecycleAction['action']>([
  'seed-world',
  'seed-character',
  'resolve-character',
])

export function isAuthAccountLifecycleAction(
  value: unknown,
): value is AuthAccountLifecycleAction {
  if (!value || typeof value !== 'object') return false
  const request = value as Record<string, unknown>
  return (
    Object.keys(request).length === 1 &&
    typeof request.action === 'string' &&
    actions.has(request.action as AuthAccountLifecycleAction['action'])
  )
}
