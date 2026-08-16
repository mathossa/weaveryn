import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import styles from '../select.module.css'

export default function CreateWorldHandoffPage() {
  return (
    <AuthenticatedAppShell>
      <AppPage
        eyebrow="Weaver"
        title="Create World"
        description="This entry point is reserved for the dedicated World creation flow."
        actions={
          <Link className={styles.backLink} href="/select/weaver">
            Back
          </Link>
        }
      >
        <StatusPanel tone="empty" title="World creation is coming next">
          <p>
            The World UI issue will replace this handoff with the production
            creation form without changing the Choose Entity entry path.
          </p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
