import { requireAuthenticatedUser } from '@/server/auth/authenticated-user'
import {
  AccountDeletionBlockedError,
  deleteAccount,
  inspectAccountDeletion,
} from '@/server/auth/account-lifecycle'

export async function GET() {
  const user = await requireAuthenticatedUser()
  return Response.json(await inspectAccountDeletion(user.id))
}

export async function DELETE() {
  const user = await requireAuthenticatedUser()

  try {
    const result = await deleteAccount(user.id)
    return Response.json(result)
  } catch (error) {
    if (error instanceof AccountDeletionBlockedError) {
      return Response.json(
        { code: error.code, blockers: error.blockers },
        { status: 409 },
      )
    }
    throw error
  }
}
