import Link from 'next/link'
import { headers } from 'next/headers'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { requireAuthenticatedUser } from '@/server/auth'
import { WorldForm } from '../_components/world-form'
import styles from '../world.module.css'

export default async function CreateWorldPage() {
  const user = await requireAuthenticatedUser(new Headers(await headers()))

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
