import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { resolveWeaverEntry } from '@/server/selection'
import { loadSelectionPageData } from '../_lib/load-selection-page-data'
import styles from '../select.module.css'

interface WeaverEntryPageProps {
  searchParams: Promise<{ world?: string | string[] }>
}

export default async function WeaverEntryPage({
  searchParams,
}: WeaverEntryPageProps) {
  const [query, pageData] = await Promise.all([
    searchParams,
    loadSelectionPageData(),
  ])
  const selectedWorldId = typeof query.world === 'string' ? query.world : undefined
  const state = resolveWeaverEntry(pageData.selection.weaverWorlds, selectedWorldId)

  if (state.kind === 'not-found') notFound()

  if (state.kind === 'create-world') {
    return (
      <AuthenticatedAppShell user={pageData.user}>
        <AppPage
          eyebrow="Weaver"
          title="Begin a World"
          description="You do not currently have a World where you can enter as Weaver."
          actions={
            <Link className={styles.backLink} href="/select">
              Back
            </Link>
          }
        >
          <StatusPanel
            tone="empty"
            title="Create World is coming next"
            action={
              <Link className={styles.secondaryLink} href="/select">
                Return to Choose Entity
              </Link>
            }
          >
            <p>
              World creation belongs to the dedicated World UI issue. This entry
              point is ready to connect to that flow when it lands.
            </p>
          </StatusPanel>
        </AppPage>
      </AuthenticatedAppShell>
    )
  }

  if (state.kind === 'world-choice') {
    return (
      <AuthenticatedAppShell user={pageData.user}>
        <AppPage
          eyebrow="Weaver"
          title="Choose a World"
          description="Select the World you want to manage or run a Campaign in."
          actions={
            <Link className={styles.backLink} href="/select">
              Back
            </Link>
          }
        >
          <div className={styles.choiceList}>
            {state.worlds.map((world) => (
              <Link
                key={world.id}
                className={styles.choiceLink}
                href={`/select/weaver?world=${world.id}`}
              >
                <strong>{world.name}</strong>
                <span>Continue →</span>
              </Link>
            ))}
          </div>
        </AppPage>
      </AuthenticatedAppShell>
    )
  }

  return (
    <AuthenticatedAppShell
      user={pageData.user}
      context={{ world: { label: state.world.name } }}
    >
      <AppPage
        eyebrow="Weaver entry selected"
        title={state.world.name}
        description="Your World context is ready. Campaign selection and management will connect here in the Campaign UI issue."
        actions={
          <Link className={styles.backLink} href="/select">
            Change selection
          </Link>
        }
      >
        <section className={styles.handoff}>
          <h2>Selected context</h2>
          <div className={styles.handoffContext}>
            <span>
              World: <strong>{state.world.name}</strong>
            </span>
            <span>Role: <strong>Weaver</strong></span>
          </div>
          <p className={styles.muted}>
            The next Campaign UI step will let you choose or create a Campaign in
            this World.
          </p>
        </section>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
