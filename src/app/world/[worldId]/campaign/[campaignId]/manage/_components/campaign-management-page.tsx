import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import type { CampaignManagementPageData } from '../_lib/campaign-management-page'

interface CampaignManagementPageProps {
  data: CampaignManagementPageData
  title: string
  description: ReactNode
  children: ReactNode
  layout?: 'readable' | 'wide'
}

export function CampaignManagementPage({
  data,
  title,
  description,
  children,
  layout = 'readable',
}: CampaignManagementPageProps) {
  return (
    <AuthenticatedAppShell user={data.user} context={data.shellContext}>
      <AppPage
        backLink={<Link href={data.manageHref}>← Manage Campaign</Link>}
        eyebrow="Manage Campaign"
        title={title}
        description={
          <>
            <strong>{data.campaign.name}</strong>
            {' · '}
            {description}
          </>
        }
        layout={layout}
      >
        {children}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
