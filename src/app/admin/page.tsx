import { AppPage } from '@/components/app-shell/app-page'
import { InstanceAdminAppShell } from '@/components/app-shell/instance-admin-app-shell'
import { WEAVERYN_VERSION } from '@/lib/version'

const sections = [
  {
    title: 'Users',
    description:
      'Search users, start password recovery, revoke sessions, and manage instance administrators.',
  },
  {
    title: 'Instance',
    description:
      'Configure branding, registration policy, and instance-wide settings.',
  },
  {
    title: 'Security',
    description:
      'Review the admin network allowlist and authentication-related configuration.',
  },
  {
    title: 'System',
    description: `Weaveryn v${WEAVERYN_VERSION}`,
  },
]

export default function AdminPage() {
  return (
    <InstanceAdminAppShell>
      <AppPage
        eyebrow="Instance administration"
        title="Admin Dashboard"
        description="Manage this Weaveryn installation independently from World and Campaign permissions."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <h2 className="text-base font-semibold text-white">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                {section.description}
              </p>
            </section>
          ))}
        </div>
      </AppPage>
    </InstanceAdminAppShell>
  )
}
