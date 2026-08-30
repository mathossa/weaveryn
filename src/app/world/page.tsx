import Image from 'next/image'
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
import actionStyles from './weaver-selector-actions.module.css'
import weaverStyles from './weaver-world-selector.module.css'

interface WorldSelectionPageProps {
  searchParams: Promise<{
    mode?: string | string[]
    show?: string | string[]
  }>
}

export default async function WorldSelectionPage({
  searchParams,
}: WorldSelectionPageProps) {
  const [user, query] = await Promise.all([loadWorldPageUser(), searchParams])
  const allWorlds = await listWorldNavigationChoices(user.id)
  const weaverMode = query.mode === 'weaver'
  const threadwatcherMode = query.mode === 'threadwatcher'
  const launcherMode = weaverMode || threadwatcherMode
  const worlds = weaverMode
    ? allWorlds.filter((world) => world.canWeave)
    : threadwatcherMode
      ? allWorlds.filter((world) => world.canThreadwatch)
      : allWorlds
  const showAllLauncherWorlds = launcherMode && query.show === 'all'
  const visibleLauncherWorlds = showAllLauncherWorlds
    ? worlds
    : worlds.slice(0, 3)

  if (launcherMode) {
    const roleLabel = weaverMode ? 'Weaver' : 'Threadwatcher'
    const mode = weaverMode ? 'weaver' : 'threadwatcher'

    return (
      <AuthenticatedAppShell user={user} variant="launcher">
        <section
          className={weaverStyles.stage}
          aria-label={`Choose a World as ${roleLabel}`}
          aria-labelledby="entry-world-title"
          style={
            showAllLauncherWorlds
              ? {
                  height: 'calc(100dvh - 2.35rem)',
                  overflowY: 'auto',
                }
              : undefined
          }
        >
          <div className={weaverStyles.background} aria-hidden="true">
            <Image
              src={uiAssets.select.backgroundDesktop.src}
              alt=""
              fill
              priority
              sizes="100vw"
              className={weaverStyles.backgroundImage}
            />
          </div>
          <div className={weaverStyles.backgroundVeil} aria-hidden="true" />

          <div className={weaverStyles.inner}>
            <div className={weaverStyles.topbar}>
              <Link className={weaverStyles.backLink} href="/select">
                <span aria-hidden="true">←</span>
                <span>Back to entry selection</span>
              </Link>
            </div>

            <div className={weaverStyles.intro}>
              <span className={weaverStyles.eyebrow}>Enter as {roleLabel}</span>
              <h1 id="entry-world-title">Choose a World</h1>
              <span className={weaverStyles.introRule} aria-hidden="true" />
              <p>
                {weaverMode
                  ? 'Choose the World whose threads you want to shape. You will pick a Campaign before entering as Weaver.'
                  : 'Choose the World whose story you want to observe. You will pick a Campaign before entering as Threadwatcher.'}
              </p>
            </div>

            {worlds.length === 0 ? (
              <div className={weaverStyles.emptyState}>
                <span className={weaverStyles.emptyKicker}>
                  {weaverMode ? 'No paths yet' : 'No paths to observe'}
                </span>
                <strong>
                  {weaverMode
                    ? 'No Weaver Worlds available'
                    : 'No Threadwatcher Worlds available'}
                </strong>
                <p>
                  {weaverMode
                    ? 'Create a World to begin weaving, or return to entry selection to join an invitation.'
                    : 'Join a Campaign as Threadwatcher to make its World available here.'}
                </p>
                {weaverMode ? (
                  <Link
                    className={weaverStyles.emptyAction}
                    href="/world/create"
                  >
                    Create your first World
                  </Link>
                ) : (
                  <Link
                    className={weaverStyles.emptyAction}
                    href="/select/join"
                  >
                    Join with invite
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className={weaverStyles.worldGrid}>
                  {visibleLauncherWorlds.map((world) => (
                    <Link
                      key={world.id}
                      className={weaverStyles.worldCard}
                      href={`/world/${world.id}/campaign?mode=${mode}`}
                      style={{
                        backgroundImage: `url(${uiAssets.fallbacks.world})`,
                      }}
                    >
                      <span className={weaverStyles.cardCopy}>
                        <span className={weaverStyles.cardKicker}>
                          {world.orphaned ? 'Orphaned World' : 'World'}
                        </span>
                        <strong>{world.name}</strong>
                        <span className={weaverStyles.meta}>
                          {weaverMode
                            ? 'Choose the Campaign you want to continue weaving.'
                            : 'Choose the Campaign you want to observe.'}
                        </span>
                        <span className={weaverStyles.cardAction}>
                          <span>Choose Campaign</span>
                          <span aria-hidden="true">›</span>
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>

                <div className={actionStyles.selectorActions}>
                  {worlds.length > 3 ? (
                    <Link
                      className={actionStyles.browseLink}
                      href={
                        showAllLauncherWorlds
                          ? `/world?mode=${mode}`
                          : `/world?mode=${mode}&show=all`
                      }
                    >
                      <span>
                        {showAllLauncherWorlds
                          ? 'Show fewer Worlds'
                          : `Browse all Worlds (${worlds.length})`}
                      </span>
                      <span aria-hidden="true">›</span>
                    </Link>
                  ) : null}

                  {weaverMode ? (
                    <>
                      <span className={actionStyles.alternativeLabel}>
                        Or begin a new weave
                      </span>
                      <Link
                        className={actionStyles.primaryCreate}
                        href="/world/create"
                      >
                        <Image
                          src={uiAssets.ui.frames.goldPrimaryAction}
                          alt=""
                          fill
                          sizes="340px"
                          className={actionStyles.primaryFrame}
                        />
                        <span>Create World</span>
                      </Link>
                    </>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </section>
      </AuthenticatedAppShell>
    )
  }

  return (
    <AuthenticatedAppShell user={user}>
      <AppPage
        eyebrow="Worlds"
        title="Choose a World"
        description="Open a World you can access, or begin a new one."
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
            title="No Worlds available"
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
                href={`/world/${world.id}`}
                style={{
                  backgroundImage: `url(${uiAssets.fallbacks.world})`,
                }}
              >
                <span className={styles.badge}>
                  {worldAccessLabel(world.accessKind)}
                </span>
                <strong>{world.name}</strong>
                <span className={styles.meta}>
                  {world.orphaned ? 'Orphaned World' : 'Open World overview'}
                </span>
              </TrackedEntryLink>
            ))}
          </div>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
