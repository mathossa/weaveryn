import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { CharacterChoiceCard } from '../_components/character-choice-card'
import { PortableCharacterChoiceCard } from '../_components/portable-character-choice-card'
import { loadSelectionPageData } from '../_lib/load-selection-page-data'
import styles from '../select.module.css'

export default async function CharacterSelectionPage() {
  const { user, selection } = await loadSelectionPageData()
  const characterEntries = [
    ...selection.characters.map((character) => ({
      kind: 'world' as const,
      character,
      createdAt: character.createdAt,
    })),
    ...selection.portableCharacters.map((character) => ({
      kind: 'portable' as const,
      character,
      createdAt: character.createdAt,
    })),
  ].sort(
    (left, right) =>
      right.createdAt.getTime() - left.createdAt.getTime() ||
      left.character.id.localeCompare(right.character.id),
  )

  return (
    <AuthenticatedAppShell user={user}>
      <AppPage
        eyebrow="Choose Entity"
        title="Select a character"
        description="Choose a World-specific incarnation, or a portable Character that has not entered an accessible World yet."
        actions={
          <Link className={styles.backLink} href="/select">
            Back
          </Link>
        }
        wide
      >
        {characterEntries.length === 0 ? (
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
            {characterEntries.map((entry) =>
              entry.kind === 'world' ? (
                <CharacterChoiceCard
                  key={`world-${entry.character.id}`}
                  character={entry.character}
                />
              ) : (
                <PortableCharacterChoiceCard
                  key={`portable-${entry.character.id}`}
                  character={entry.character}
                />
              ),
            )}
          </div>
        )}
      </AppPage>
    </AuthenticatedAppShell>
  )
}
