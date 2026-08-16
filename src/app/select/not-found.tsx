import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import styles from './select.module.css'

export default function SelectNotFound() {
  return (
    <AuthenticatedAppShell>
      <AppPage eyebrow="Choose Entity" title="Selection unavailable">
        <StatusPanel
          tone="error"
          title="That entry is not available to this account"
          action={
            <Link className={styles.secondaryLink} href="/select">
              Return to Choose Entity
            </Link>
          }
        >
          <p>
            The Character, Campaign, or World may no longer exist or may not be
            accessible to the signed-in user.
          </p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
