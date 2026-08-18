'use client'

import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'

export default function WorldEntitiesError({ reset }: { reset: () => void }) {
  return (
    <AuthenticatedAppShell>
      <AppPage eyebrow="Worldbuilding" title="World entities unavailable" wide>
        <StatusPanel
          tone="error"
          title="Could not load the World entity workspace"
          action={<button onClick={reset}>Try again</button>}
        >
          <p>
            The request may have failed or your current context may not permit the
            requested content.
          </p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
