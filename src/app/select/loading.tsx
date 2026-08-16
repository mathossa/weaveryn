import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'

export default function SelectLoading() {
  return (
    <AuthenticatedAppShell>
      <AppPage
        eyebrow="Signed in"
        title="Choose Entity"
        description="Loading the Worlds, Campaigns, and Characters you can access."
      >
        <StatusPanel tone="loading" title="Gathering your weave">
          <p>Your authorized entry choices are being loaded.</p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
