import { describe, expect, it } from 'vitest'
import {
  createAccountLifecycleService,
  type AccountLifecycleDatabase,
} from './account-lifecycle-service'

const USER_ID = '14000000-0000-4000-8000-000000000001'
const WORLD_ID = '14000000-0000-4000-8000-000000000002'

interface State {
  userExists: boolean
  campaignCount: number
  characterCount: number
  worldOwnerId: string | null
  sessionCount: number
  accountCount: number
  failWorldOrphaning?: boolean
}

function database(state: State): AccountLifecycleDatabase {
  const transaction = {
    user: {
      findUnique: async () => (state.userExists ? { id: USER_ID } : null),
      delete: async () => {
        state.userExists = false
        state.sessionCount = 0
        state.accountCount = 0
        return { id: USER_ID }
      },
    },
    campaign: { count: async () => state.campaignCount },
    character: { count: async () => state.characterCount },
    world: {
      count: async () => (state.worldOwnerId === USER_ID ? 1 : 0),
      findMany: async () =>
        state.worldOwnerId === USER_ID ? [{ id: WORLD_ID }] : [],
      updateMany: async () => {
        if (state.failWorldOrphaning) return { count: 0 }
        if (state.worldOwnerId !== USER_ID) return { count: 0 }
        state.worldOwnerId = null
        return { count: 1 }
      },
    },
  }

  return {
    $transaction: async (operation: (value: typeof transaction) => unknown) =>
      operation(transaction),
  } as unknown as AccountLifecycleDatabase
}

function baseState(): State {
  return {
    userExists: true,
    campaignCount: 0,
    characterCount: 0,
    worldOwnerId: USER_ID,
    sessionCount: 2,
    accountCount: 1,
  }
}

describe('account lifecycle service', () => {
  it('blocks deletion while any owned Campaign remains unresolved', async () => {
    const state = { ...baseState(), campaignCount: 1 }
    const service = createAccountLifecycleService(database(state))

    await expect(service.deleteAccount(USER_ID)).rejects.toMatchObject({
      code: 'ACCOUNT_DELETION_BLOCKED',
      blockers: ['CAMPAIGNS'],
    })
    expect(state.userExists).toBe(true)
    expect(state.worldOwnerId).toBe(USER_ID)
  })

  it('blocks deletion while any owned Character remains unresolved', async () => {
    const state = { ...baseState(), characterCount: 1 }
    const service = createAccountLifecycleService(database(state))

    await expect(service.deleteAccount(USER_ID)).rejects.toMatchObject({
      code: 'ACCOUNT_DELETION_BLOCKED',
      blockers: ['CHARACTERS'],
    })
    expect(state.userExists).toBe(true)
  })

  it('orphans owned Worlds and removes auth records atomically with the User', async () => {
    const state = baseState()
    const service = createAccountLifecycleService(database(state))

    const result = await service.deleteAccount(USER_ID)

    expect(result).toEqual({ userId: USER_ID, orphanedWorldIds: [WORLD_ID] })
    expect(state.worldOwnerId).toBeNull()
    expect(state.userExists).toBe(false)
    expect(state.sessionCount).toBe(0)
    expect(state.accountCount).toBe(0)
  })

  it('does not delete the User when guarded World orphaning fails', async () => {
    const state = { ...baseState(), failWorldOrphaning: true }
    const service = createAccountLifecycleService(database(state))

    await expect(service.deleteAccount(USER_ID)).rejects.toMatchObject({
      code: 'ORPHANED_WORLD_CHANGED',
    })
    expect(state.userExists).toBe(true)
    expect(state.worldOwnerId).toBe(USER_ID)
    expect(state.sessionCount).toBe(2)
  })
})
