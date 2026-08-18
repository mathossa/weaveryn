import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { StatusPanel } from '@/components/ui/status-panel'
import { uiAssets } from '@/lib/ui-assets'
import { listWorldNavigationChoices } from '@/server/worlds'
import { loadWorldPageUser } from './_lib/load-world-user'
import styles from './world.module.css'

const accessLabels = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
  CAMPAIGN_ONLY: 'Campaign access',
} as const

interface WorldSelectionPageProps {
  searchParams: Promise<{ mode?: string | string[] }>
}

export default async function WorldSelectionPage({
  searchParams,
}: WorldSelectionPageProps) {
  const [user, query] = await Promise.all([loadWorldPageUser(), searchParams])
  const allWorlds = await listWorldNavigationChoices(user.id)
  const weaverMode = query.mode === 'weaver'
  const worlds = weaverMode
    ? allWorlds.filter((world) => world.canWeave)
    : allWorlds

  return (
    <AuthenticatedAppShell user={user}>
      <AppPage
        eyebrow={weaverMode ? 'Weaver' : 'Worlds'}
        title="Choose a World"
        description={
          weaverMode
            ? 'Choose a World where you can enter as owner, administrator, GM, or assistant GM.'
            : 'Open a World you can access, or begin a new one.'
        }
        wide
        actions={
          <Link className={styles.secondary} href="/world/create">
            Create World
          </Link>
        }
      >
        {worlds.length === 0 ? (
          <StatusPanel
            tone="empty"
            title={
              weaverMode ? 'No Weaver Worlds available' : 'No Worlds available'
            }
            action={
              <Link className={styles.secondary} href="/world/create">
                Create your first World
              </Link>
            }
          >
            <p>Create a World or join one through a Campaign or invitation.</p>
          </StatusPanel>
        ) : (
          <div className={styles.grid}>
            {worlds.map((world) => (
              <TrackedEntryLink
                key={world.id}
                className={styles.card}
                href={
                  weaverMode
                    ? `/world/${world.id}?mode=weaver`
                    : `/world/${world.id}`
                }
                tracking={
                  weaverMode ? { kind: 'WEAVER', worldId: world.id } : undefined
                }
                style={{ backgroundImage: `url(${uiAssets.fallbacks.world})` }}
              >
                <span className={styles.badge}>
                  {accessLabels[world.accessKind]}
                </span>
                <strong>{world.name}</strong>
                <span className={styles.meta}>
                  {world.orphaned ? 'Orphaned World' : 'Open World'}
                </span>
              </TrackedEntryLink>
            ))}
          </div>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
