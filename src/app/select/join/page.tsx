import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { JoinInviteForm } from './join-invite-form'
import styles from '../select.module.css'

export default function JoinInviteHandoffPage() {
  return (
    <AuthenticatedAppShell>
      <AppPage
        eyebrow="Choose Entity"
        title="Join with invite"
        description="Paste a World or Campaign invitation link. You will review the destination and role before anything is accepted."
        actions={
          <Link className={styles.backLink} href="/select">
            Back
          </Link>
        }
      >
        <JoinInviteForm />
      </AppPage>
    </AuthenticatedAppShell>
  )
}
