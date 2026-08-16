import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'

export default function WorldLoading() {
  return (
    <AuthenticatedAppShell>
      <AppPage title="Worlds" eyebrow="Loading">
        <StatusPanel tone="loading" title="Loading World information">
          <p>Checking your World and Campaign access.</p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
