import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'

export default function WorldEntityNotFound() {
  return (
    <AuthenticatedAppShell>
      <AppPage eyebrow="Worldbuilding" title="World entity not found" wide>
        <StatusPanel
          tone="empty"
          title="This entity is unavailable in your current context"
          action={<Link href="/world">Choose a World</Link>}
        >
          <p>
            It may not exist, or its visibility may not include the World or
            Campaign context you entered through.
          </p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
