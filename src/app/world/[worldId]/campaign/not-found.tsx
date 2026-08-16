import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import styles from './campaign.module.css'

export default function CampaignNotFound() {
  return (
    <AuthenticatedAppShell>
      <AppPage eyebrow="Campaigns" title="Campaign unavailable">
        <StatusPanel
          tone="empty"
          title="You cannot open this Campaign"
          action={
            <Link className={styles.secondary} href="/world">
              Back to Worlds
            </Link>
          }
        >
          <p>The Campaign does not exist in this World or is not accessible to your account.</p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
