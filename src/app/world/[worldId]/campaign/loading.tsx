import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'

export default function CampaignLoading() {
  return (
    <AuthenticatedAppShell>
      <AppPage eyebrow="Campaigns" title="Loading Campaigns">
        <StatusPanel tone="loading" title="Preparing Campaign context">
          <p>Loading the Campaigns and permissions available to you.</p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
