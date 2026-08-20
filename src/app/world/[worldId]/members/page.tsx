import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { MembershipInviteManager } from '@/components/invitations/membership-invite-manager'
import { MembershipManager } from '@/components/memberships/membership-manager'
import { RoleHelp } from '@/components/memberships/role-help'
import { StatusPanel } from '@/components/ui/status-panel'
import { membershipInvitationService } from '@/server/invitations'
import {
  getWorldOverview,
  listWorldMembershipsForManagement,
  WORLD_ROLES,
} from '@/server/worlds'
import { loadWorldPageUser } from '../../_lib/load-world-user'
import styles from '../../world.module.css'

interface WorldMembersPageProps {
  params: Promise<{ worldId: string }>
}

export default async function WorldMembersPage({ params }: WorldMembersPageProps) {
  const [{ worldId }, user] = await Promise.all([params, loadWorldPageUser()])
  const world = await getWorldOverview(worldId, user.id)
  if (!world) notFound()

  const management = world.canManageMembers
    ? await Promise.all([
        membershipInvitationService.listWorldInvitations({
          actorUserId: user.id,
          worldId: world.id,
        }),
        listWorldMembershipsForManagement(world.id, user.id),
      ])
    : null

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: { label: world.name, href: `/world/${world.id}?mode=weaver` },
      }}
    >
      <AppPage
        eyebrow="World management"
        title="World members"
        description={`Manage access to ${world.name} and its active invitation links.`}
        actions={
          <Link className={styles.secondary} href={`/world/${world.id}?mode=weaver`}>
            Back to World
          </Link>
        }
      >
        {management ? (
          <div className={styles.stack}>
            <section className={styles.panel}>
              <h2>Members</h2>
              <p className={styles.meta}>
                World ownership is managed separately from membership roles.
              </p>
              <RoleHelp targetKind="World" />
              <MembershipManager
                endpoint={`/api/v1/worlds/${world.id}/members`}
                roles={WORLD_ROLES}
                targetKind="World"
                initialMembers={management[1] ?? []}
              />
            </section>

            <section className={styles.panel} id="invitations">
              <h2>Invitations</h2>
              <p className={styles.meta}>
                Invitation links are single-use and only shown when created.
              </p>
              <MembershipInviteManager
                endpoint={`/api/v1/worlds/${world.id}/invitations`}
                roles={WORLD_ROLES}
                targetKind="World"
                initialInvitations={management[0].map((invitation) => ({
                  id: invitation.id,
                  role: invitation.role,
                  expiresAt: invitation.expiresAt.toISOString(),
                }))}
              />
            </section>
          </div>
        ) : (
          <StatusPanel tone="empty" title="World management unavailable">
            <p>You do not have permission to manage members in this World.</p>
          </StatusPanel>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
