import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'

export default function SelectPage() {
  return (
    <AuthenticatedAppShell>
      <AppPage
        eyebrow="Signed in"
        title="Choose Entity"
        description="Choose how you want to enter Weaveryn. Your available Worlds, Campaigns, and Characters will appear here."
      >
        <StatusPanel tone="empty" title="Selection is the next step">
          <p>
            The authenticated shell is ready. The full Choose Entity experience
            will replace this placeholder in the next UI issue.
          </p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
