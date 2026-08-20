import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { StatusPanel } from '@/components/ui/status-panel'
import { worldAccessLabel } from '@/lib/role-labels'
import { uiAssets } from '@/lib/ui-assets'
import { listWorldNavigationChoices } from '@/server/worlds'
import { loadWorldPageUser } from './_lib/load-world-user'
import styles from './world.module.css'

interface WorldSelectionPageProps {
  searchParams: Promise<{ mode?: string | string[] }>
}

export default async function WorldSelectionPage({
  searchParams,
}: WorldSelectionPageProps) {
  const [user, query] = await Promise.all([loadWorldPageUser(), searchParams])
  const allWorlds = await listWorldNavigationChoices(user.id)
  const weaverMode = query.mode === 'weaver'
  const threadwatcherMode = query.mode === 'threadwatcher'
  const worlds = weaverMode
    ? allWorlds.filter((world) => world.canWeave)
    : threadwatcherMode
      ? allWorlds.filter((world) => world.canThreadwatch)
      : allWorlds

  return (
    <AuthenticatedAppShell user={user}>
      <AppPage
        eyebrow={
          weaverMode ? 'Weaver' : threadwatcherMode ? 'Threadwatcher' : 'Worlds'
        }
        title="Choose a World"
        description={
          weaverMode
            ? 'Choose a World where you can enter as a Weaver.'
            : threadwatcherMode
              ? 'Choose a World that contains a Campaign you can observe as a Threadwatcher.'
              : 'Open a World you can access, or begin a new one.'
        }
        wide
        actions={
          weaverMode || threadwatcherMode ? undefined : (
            <Link className={styles.secondary} href="/world/create">
              Create World
            </Link>
          )
        }
      >
        {worlds.length === 0 ? (
          <StatusPanel
            tone="empty"
            title={
              weaverMode
                ? 'No Weaver Worlds available'
                : threadwatcherMode
                  ? 'No Threadwatcher Worlds available'
                  : 'No Worlds available'
            }
            action={
              weaverMode || threadwatcherMode ? (
                <Link className={styles.secondary} href="/select/join">
                  Join with invite
                </Link>
              ) : (
                <Link className={styles.secondary} href="/world/create">
                  Create your first World
                </Link>
              )
            }
          >
            <p>
              {threadwatcherMode
                ? 'Join a Campaign as a Threadwatcher to make its World available here.'
                : 'Create a World or join one through a Campaign or invitation.'}
            </p>
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
                    : threadwatcherMode
                      ? `/world/${world.id}/campaign?mode=threadwatcher`
                      : `/world/${world.id}`
                }
                tracking={
                  weaverMode ? { kind: 'WEAVER', worldId: world.id } : undefined
                }
                style={{ backgroundImage: `url(${uiAssets.fallbacks.world})` }}
              >
                <span className={styles.badge}>
                  {threadwatcherMode
                    ? 'Threadwatcher'
                    : worldAccessLabel(world.accessKind)}
                </span>
                <strong>{world.name}</strong>
                <span className={styles.meta}>
                  {threadwatcherMode
                    ? 'Choose a Campaign'
                    : world.orphaned
                      ? 'Orphaned World'
                      : 'Open World'}
                </span>
              </TrackedEntryLink>
            ))}
          </div>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
