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
            ? 'Choose a World where you can enter as a Weaver, or create a new World.'
            : threadwatcherMode
              ? 'Choose a World you can access. Worlds with a Campaign you can observe continue in Threadwatcher mode.'
              : 'Open a World you can access, or begin a new one.'
        }
        wide
        actions={
          threadwatcherMode ? undefined : (
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
                  ? 'No accessible Worlds available'
                  : 'No Worlds available'
            }
            action={
              threadwatcherMode ? (
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
                ? 'Join a World or Campaign to make its World available here.'
                : weaverMode
                  ? 'Create a World to begin weaving, or return to entry selection to join an invitation.'
                  : 'Create a World or join one through a Campaign or invitation.'}
            </p>
          </StatusPanel>
        ) : (
          <div className={styles.grid}>
            {worlds.map((world) => {
              const enterAsThreadwatcher =
                threadwatcherMode && world.canThreadwatch

              return (
                <TrackedEntryLink
                  key={world.id}
                  className={styles.card}
                  href={
                    weaverMode
                      ? `/world/${world.id}?mode=weaver`
                      : enterAsThreadwatcher
                        ? `/world/${world.id}/campaign?mode=threadwatcher`
                        : `/world/${world.id}`
                  }
                  tracking={
                    weaverMode
                      ? { kind: 'WEAVER', worldId: world.id }
                      : undefined
                  }
                  style={{ backgroundImage: `url(${uiAssets.fallbacks.world})` }}
                >
                  <span className={styles.badge}>
                    {enterAsThreadwatcher
                      ? 'Threadwatcher'
                      : worldAccessLabel(world.accessKind)}
                  </span>
                  <strong>{world.name}</strong>
                  <span className={styles.meta}>
                    {enterAsThreadwatcher
                      ? 'Choose a Campaign'
                      : world.orphaned
                        ? 'Orphaned World'
                        : 'Open World overview'}
                  </span>
                </TrackedEntryLink>
              )
            })}
          </div>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
