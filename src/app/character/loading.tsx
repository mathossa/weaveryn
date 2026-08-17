import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'

export default function CharacterLoading() {
  return (
    <AuthenticatedAppShell>
      <AppPage eyebrow="Characters" title="Loading Character…">
        <StatusPanel tone="loading" title="Loading Character context" />
      </AppPage>
    </AuthenticatedAppShell>
  )
}
