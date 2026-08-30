import Image from 'next/image'
import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { StatusPanel } from '@/components/ui/status-panel'
import { worldAccessLabel } from '@/lib/role-labels'
import { uiAssets } from '@/lib/ui-assets'
import {
  listEntryPreferences,
  WEAVER_WORLD_ENTRY_KEY_PREFIX,
} from '@/server/selection'
import { listWorldNavigationChoices } from '@/server/worlds'
import { SelectLogoutButton } from '@/app/select/_components/select-logout-button'
import { CinematicEntryBrowser } from './_components/cinematic-entry-browser'
import { WeaverFavoriteButton } from './_components/weaver-favorite-button'
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

function compareFavoriteThenRecent(
  left: { name: string; pinned: boolean; lastUsedAt: Date | null },
  right: { name: string; pinned: boolean; lastUsedAt: Date | null },
) {
  if (left.pinned !== right.pinned) return left.pinned ? -1 : 1

  const recentDifference =
    (right.lastUsedAt?.getTime() ?? 0) - (left.lastUsedAt?.getTime() ?? 0)
  if (recentDifference !== 0) return recentDifference
  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
}

export default async function WorldSelectionPage({
  searchParams,
}: WorldSelectionPageProps) {
  const [user, query] = await Promise.all([loadWorldPageUser(), searchParams])
  const [allWorlds, entryPreferences] = await Promise.all([
    listWorldNavigationChoices(user.id),
    listEntryPreferences(user.id),
  ])
  const weaverMode = query.mode === 'weaver'
  const threadwatcherMode = query.mode === 'threadwatcher'
  const launcherMode = weaverMode || threadwatcherMode
  const worlds = weaverMode
    ? allWorlds.filter((world) => world.canWeave)
    : threadwatcherMode
      ? allWorlds.filter((world) => world.canThreadwatch)
      : allWorlds
  const showAllLauncherWorlds = launcherMode && query.show === 'all'

  const worldPreferences = new Map<
    string,
    { pinned: boolean; lastUsedAt: Date | null }
  >()
  for (const preference of entryPreferences) {
    if (preference.kind !== 'WEAVER' || !preference.worldId) continue

    const current = worldPreferences.get(preference.worldId)
    const currentTime = current?.lastUsedAt?.getTime() ?? 0
    const preferenceTime = preference.lastUsedAt?.getTime() ?? 0
    const isWorldFavoritePreference =
      preference.entryKey ===
      `${WEAVER_WORLD_ENTRY_KEY_PREFIX}:${preference.worldId}`

    worldPreferences.set(preference.worldId, {
      pinned: isWorldFavoritePreference
        ? preference.pinned
        : (current?.pinned ?? false),
      lastUsedAt:
        preferenceTime > currentTime
          ? preference.lastUsedAt
          : (current?.lastUsedAt ?? null),
    })
  }

  const launcherWorlds = worlds.map((world) => {
    const preference = worldPreferences.get(world.id)
    return {
      ...world,
      pinned: preference?.pinned ?? false,
      lastUsedAt: preference?.lastUsedAt ?? null,
    }
  })
  const orderedLauncherWorlds = weaverMode
    ? [...launcherWorlds].sort(compareFavoriteThenRecent)
    : launcherWorlds
  const featuredWorlds = orderedLauncherWorlds.slice(0, 3)

  if (launcherMode) {
    const roleLabel = weaverMode ? 'Weaver' : 'Threadwatcher'
    const mode = weaverMode ? 'weaver' : 'threadwatcher'

    return (
      <AuthenticatedAppShell user={user} variant="launcher">
        <section
          className={weaverStyles.stage}
          aria-label={`Choose a World as ${roleLabel}`}
          data-cinematic-selector="true"
          data-browse={showAllLauncherWorlds ? 'true' : 'false'}
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
          <SelectLogoutButton />

          <div className={weaverStyles.inner}>
            <div className={weaverStyles.topbar}>
              <Link className={weaverStyles.backLink} href="/select">
                <span aria-hidden="true">←</span>
                <span>Back to entry selection</span>
              </Link>
            </div>

            {showAllLauncherWorlds ? (
              <CinematicEntryBrowser
                kind="world"
                roleLabel={roleLabel}
                closeHref={`/world?mode=${mode}`}
                favoritesEnabled={weaverMode}
                initialSort={weaverMode ? 'recent' : 'az'}
                entries={orderedLauncherWorlds.map((world) => ({
                  id: world.id,
                  name: world.name,
                  kicker: world.orphaned ? 'Orphaned World' : 'World',
                  meta: weaverMode
                    ? 'Choose the Campaign you want to continue weaving.'
                    : 'Choose the Campaign you want to observe.',
                  href: `/world/${world.id}/campaign?mode=${mode}`,
                  backgroundImage: uiAssets.fallbacks.world,
                  filterValue: world.orphaned ? 'orphaned' : 'standard',
                  lastUsedAt: weaverMode
                    ? (world.lastUsedAt?.toISOString() ?? null)
                    : null,
                  favorite: weaverMode ? world.pinned : false,
                  favoriteTarget: weaverMode
                    ? { worldId: world.id }
                    : undefined,
                }))}
              />
            ) : (
              <>
                <div className={weaverStyles.intro}>
                  <span className={weaverStyles.eyebrow}>
                    Enter as {roleLabel}
                  </span>
                  <h1>Choose a World</h1>
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
                      {featuredWorlds.map((world) => (
                        <div
                          key={world.id}
                          style={{ position: 'relative', minWidth: 0 }}
                        >
                          <Link
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

                          {weaverMode ? (
                            <WeaverFavoriteButton
                              worldId={world.id}
                              pinned={world.pinned}
                              label="World"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className={actionStyles.selectorActions}>
                      {worlds.length > 3 ? (
                        <Link
                          className={actionStyles.browseLink}
                          href={`/world?mode=${mode}&show=all`}
                        >
                          <span>Browse all Worlds ({worlds.length})</span>
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
