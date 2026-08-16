import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { CharacterChoiceCard } from '../_components/character-choice-card'
import { loadSelectionPageData } from '../_lib/load-selection-page-data'
import styles from '../select.module.css'

export default async function CharacterSelectionPage() {
  const { user, selection } = await loadSelectionPageData()

  return (
    <AuthenticatedAppShell user={user}>
      <AppPage
        eyebrow="Choose Entity"
        title="Select a character"
        description="Each card represents a World-specific incarnation of one of your Characters."
        actions={
          <Link className={styles.backLink} href="/select">
            Back
          </Link>
        }
        wide
      >
        {selection.characters.length === 0 ? (
          <StatusPanel
            tone="empty"
            title="No characters available"
            action={
              <Link
                className={styles.primaryLink}
                href="/select/create-character"
              >
                Create Character
              </Link>
            }
          >
            <p>
              Create a Character or join through an invitation to get started.
            </p>
          </StatusPanel>
        ) : (
          <div className={styles.characterGrid}>
            {selection.characters.map((character) => (
              <CharacterChoiceCard key={character.id} character={character} />
            ))}
          </div>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
