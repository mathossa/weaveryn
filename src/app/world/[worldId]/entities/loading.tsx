import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'

export default function WorldEntitiesLoading() {
  return (
    <AuthenticatedAppShell>
      <AppPage eyebrow="Worldbuilding" title="Loading World entities…" wide>
        <StatusPanel tone="loading" title="Loading authorized World content" />
      </AppPage>
    </AuthenticatedAppShell>
  )
}
