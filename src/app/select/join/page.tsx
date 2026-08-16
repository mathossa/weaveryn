import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import styles from '../select.module.css'

export default function JoinInviteHandoffPage() {
  return (
    <AuthenticatedAppShell>
      <AppPage
        eyebrow="Choose Entity"
        title="Join with invite"
        description="This entry point is reserved for the future World or Campaign invitation flow."
        actions={
          <Link className={styles.backLink} href="/select">
            Back
          </Link>
        }
      >
        <StatusPanel tone="empty" title="Invite joining is not implemented yet">
          <p>
            Choose Entity exposes the invitation entry point now without inventing
            invite backend behavior before its dedicated issue defines it.
          </p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
