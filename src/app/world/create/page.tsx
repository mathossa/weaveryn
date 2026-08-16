import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { WorldForm } from '../_components/world-form'
import { loadWorldPageUser } from '../_lib/load-world-user'
import styles from '../world.module.css'

export default async function CreateWorldPage() {
  const user = await loadWorldPageUser()

  return (
    <AuthenticatedAppShell user={user}>
      <AppPage
        eyebrow="Worlds"
        title="Create World"
        description="Create the persistent setting that will contain Campaigns, Characters, timelines, and World content."
        actions={
          <Link className={styles.secondary} href="/world">
            Back to Worlds
          </Link>
        }
      >
        <section className={styles.panel}>
          <WorldForm mode="create" />
        </section>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
