import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'

export default function CharacterNotFound() {
  return (
    <AuthenticatedAppShell>
      <AppPage eyebrow="Characters" title="Character unavailable">
        <StatusPanel
          tone="empty"
          title="This Character is not available"
          action={<Link href="/character">Back to Characters</Link>}
        >
          <p>The Character may not exist or may not belong to this account.</p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
