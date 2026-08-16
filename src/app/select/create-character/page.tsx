import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import styles from '../select.module.css'

export default function CreateCharacterHandoffPage() {
  return (
    <AuthenticatedAppShell>
      <AppPage
        eyebrow="Choose Entity"
        title="Create Character"
        description="This entry point is reserved for the dedicated Character creation flow."
        actions={
          <Link className={styles.backLink} href="/select">
            Back
          </Link>
        }
      >
        <StatusPanel tone="empty" title="Character creation is coming next">
          <p>
            The full Character creation experience belongs to the Character UI
            issue. Choose Entity already exposes the production entry point for it.
          </p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
