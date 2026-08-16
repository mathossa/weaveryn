import { describe, expect, it } from 'vitest'
import {
  createInstanceAdminService,
  type InstanceAdminDatabase,
} from './instance-admin-service'

interface StoredUser {
  id: string
  email: string
  isInstanceAdmin: boolean
}

function database(users: StoredUser[]): InstanceAdminDatabase {
  const userApi = {
    findUnique: async ({ where }: { where: { email: string } }) =>
      users.find((user) => user.email === where.email) ?? null,
    count: async () => users.filter((user) => user.isInstanceAdmin).length,
    update: async ({
      where,
      data,
    }: {
      where: { id: string }
      data: { isInstanceAdmin: boolean }
    }) => {
      const user = users.find((entry) => entry.id === where.id)
      if (!user) throw new Error('missing test user')
      user.isInstanceAdmin = data.isInstanceAdmin
      return { ...user }
    },
  }

  return {
    user: userApi,
    $transaction: async (
      operation: (value: { user: typeof userApi }) => unknown,
    ) => operation({ user: userApi }),
  } as unknown as InstanceAdminDatabase
}

describe('instance admin service', () => {
  it('promotes a user by normalized email', async () => {
    const users = [
      {
        id: '61000000-0000-4000-8000-000000000001',
        email: 'admin@example.test',
        isInstanceAdmin: false,
      },
    ]
    const service = createInstanceAdminService(database(users))

    await expect(
      service.promoteByEmail(' ADMIN@EXAMPLE.TEST '),
    ).resolves.toMatchObject({
      isInstanceAdmin: true,
    })
    expect(users[0]?.isInstanceAdmin).toBe(true)
  })

  it('rejects promotion when the user does not exist', async () => {
    const service = createInstanceAdminService(database([]))

    await expect(
      service.promoteByEmail('missing@example.test'),
    ).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    })
  })

  it('prevents demoting the final instance administrator', async () => {
    const users = [
      {
        id: '61000000-0000-4000-8000-000000000001',
        email: 'only@example.test',
        isInstanceAdmin: true,
      },
    ]
    const service = createInstanceAdminService(database(users))

    await expect(
      service.demoteByEmail('only@example.test'),
    ).rejects.toMatchObject({
      code: 'LAST_ADMIN',
    })
    expect(users[0]?.isInstanceAdmin).toBe(true)
  })

  it('demotes an administrator when another administrator remains', async () => {
    const users = [
      {
        id: '61000000-0000-4000-8000-000000000001',
        email: 'first@example.test',
        isInstanceAdmin: true,
      },
      {
        id: '61000000-0000-4000-8000-000000000002',
        email: 'second@example.test',
        isInstanceAdmin: true,
      },
    ]
    const service = createInstanceAdminService(database(users))

    await expect(
      service.demoteByEmail('first@example.test'),
    ).resolves.toMatchObject({
      isInstanceAdmin: false,
    })
    expect(users[0]?.isInstanceAdmin).toBe(false)
    expect(users[1]?.isInstanceAdmin).toBe(true)
  })
})
