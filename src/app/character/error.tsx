'use client'

import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'

export default function CharacterError({ reset }: { reset: () => void }) {
  return (
    <AuthenticatedAppShell>
      <AppPage eyebrow="Characters" title="Character unavailable">
        <StatusPanel
          tone="error"
          title="We could not load this Character"
          action={<button onClick={reset}>Try again</button>}
        >
          <p>The Character context could not be loaded. Retry the request or return to your Character list.</p>
        </StatusPanel>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
