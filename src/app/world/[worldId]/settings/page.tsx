import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { getWorldOverview } from '@/server/worlds'
import { WorldForm } from '../../_components/world-form'
import { loadWorldPageUser } from '../../_lib/load-world-user'
import styles from '../../world.module.css'

interface WorldSettingsPageProps {
  params: Promise<{ worldId: string }>
}

export default async function WorldSettingsPage({
  params,
}: WorldSettingsPageProps) {
  const [{ worldId }, user] = await Promise.all([params, loadWorldPageUser()])
  const world = await getWorldOverview(worldId, user.id)
  if (!world) notFound()

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: { label: world.name, href: `/world/${world.id}?mode=weaver` },
      }}
    >
      <AppPage
        eyebrow="World management"
        title="World settings"
        description={`Edit the basic information for ${world.name}.`}
        actions={
          <Link className={styles.secondary} href={`/world/${world.id}?mode=weaver`}>
            Back to World
          </Link>
        }
      >
        {world.canEditBasicInfo ? (
          <section className={styles.panel}>
            <WorldForm
              mode="edit"
              worldId={world.id}
              initialName={world.name}
              initialDescription={world.description}
            />
          </section>
        ) : (
          <StatusPanel tone="empty" title="World settings unavailable">
            <p>You do not have permission to edit this World.</p>
          </StatusPanel>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
