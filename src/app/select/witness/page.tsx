import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { loadSelectionPageData } from '../_lib/load-selection-page-data'
import styles from '../select.module.css'

export default async function WitnessSelectionPage() {
  const { user, selection } = await loadSelectionPageData()
  const campaigns = selection.campaignMemberships.filter(
    (campaign) => campaign.role === 'SPECTATOR',
  )

  return (
    <AuthenticatedAppShell user={user}>
      <AppPage
        eyebrow="Witness"
        title="Choose a Campaign"
        description="Enter as a Witness to observe a Campaign without taking a Character role."
        actions={
          <Link className={styles.backLink} href="/select">
            Back to Choose Entity
          </Link>
        }
      >
        {campaigns.length === 0 ? (
          <StatusPanel
            tone="empty"
            title="No Campaigns available to witness"
            action={
              <Link className={styles.secondaryLink} href="/select/join">
                Join with invite
              </Link>
            }
          >
            <p>
              A Spectator invitation gives you Witness access without creating a
              WorldCharacter.
            </p>
          </StatusPanel>
        ) : (
          <div className={styles.choiceList}>
            {campaigns.map((campaign) => (
              <Link
                className={styles.choiceLink}
                href={`/world/${campaign.worldId}/campaign/${campaign.id}`}
                key={campaign.id}
              >
                <strong>{campaign.name}</strong>
                <span>{campaign.worldName} →</span>
              </Link>
            ))}
          </div>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
