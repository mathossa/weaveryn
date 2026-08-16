import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import styles from './world.module.css'

export default function WorldNotFound() {
  return (
    <AuthenticatedAppShell>
      <AppPage title="World unavailable" eyebrow="Worlds">
        <StatusPanel
          tone="empty"
          title="You cannot open this World"
          action={
            <Link className={styles.secondary} href="/world">
              Choose another World
            </Link>
          }
        >
          <p>The World does not exist or is not available through your current access.</p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
