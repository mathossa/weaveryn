import { AppPage } from '@/components/app-shell/app-page'
import { InstanceAdminAppShell } from '@/components/app-shell/instance-admin-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { WEAVERYN_VERSION } from '@/lib/version'

export default function AdminPage() {
  return (
    <InstanceAdminAppShell>
      <AppPage
        eyebrow="Instance administration"
        title="Admin Dashboard"
        description="Manage this Weaveryn installation independently from World and Campaign permissions."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <StatusPanel tone="neutral" title="Users">
            <p>
              User search, password recovery, session revocation, and instance
              administrator management will live here.
            </p>
          </StatusPanel>
          <StatusPanel tone="neutral" title="Instance">
            <p>
              Branding, registration policy, and instance-wide settings will
              live here.
            </p>
          </StatusPanel>
          <StatusPanel tone="neutral" title="Security">
            <p>
              Admin access is restricted by the configured network allowlist in
              addition to normal authentication.
            </p>
          </StatusPanel>
          <StatusPanel tone="neutral" title="System">
            <p>Weaveryn v{WEAVERYN_VERSION}</p>
          </StatusPanel>
        </div>
      </AppPage>
    </InstanceAdminAppShell>
  )
}
