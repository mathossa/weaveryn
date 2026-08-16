import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { StatusPanel } from '@/components/ui/status-panel'
import { CharacterChoiceCard } from './_components/character-choice-card'
import { loadSelectionPageData } from './_lib/load-selection-page-data'
import styles from './select.module.css'

export default async function SelectPage() {
  const { user, selection } = await loadSelectionPageData()
  const recentCharacters = selection.characters.slice(0, 3)
  const hasAnyEntry =
    selection.characters.length > 0 || selection.weaverWorlds.length > 0

  return (
    <AuthenticatedAppShell user={user}>
      <AppPage
        eyebrow="Signed in"
        title="Choose Entity"
        description="Enter through a character you play, or join as Weaver to manage Worlds and Campaigns."
        wide
      >
        <div className={styles.stack}>
          {selection.characters.length > 0 ? (
            <section className={styles.section} aria-labelledby="recent-characters">
              <div className={styles.sectionHeader}>
                <div>
                  <h2 id="recent-characters">Recent characters</h2>
                  <p>Most recently created World incarnations appear first.</p>
                </div>
              </div>

              <div
                className={`${styles.characterGrid} ${styles.recentCharacterGrid}`}
              >
                {recentCharacters.map((character) => (
                  <CharacterChoiceCard key={character.id} character={character} />
                ))}
              </div>

              {selection.characters.length > 3 ? (
                <div className={`${styles.moreRow} ${styles.desktopOnly}`}>
                  <Link className={styles.secondaryLink} href="/select/characters">
                    Select other character
                  </Link>
                </div>
              ) : null}

              {selection.characters.length > 1 ? (
                <div className={`${styles.moreRow} ${styles.mobileOnly}`}>
                  <Link className={styles.secondaryLink} href="/select/characters">
                    Select other character
                  </Link>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className={styles.section} aria-labelledby="weaver-entry">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="weaver-entry">Weaver</h2>
                <p>Enter through the game-master side of Weaveryn.</p>
              </div>
            </div>
            <Link className={styles.weaverCard} href="/select/weaver">
              <span className={styles.weaverGlyph} aria-hidden="true">
                ✦
              </span>
              <span className={styles.weaverCopy}>
                <strong>Join as Weaver</strong>
                <span>Choose a World, then continue to Campaign management.</span>
              </span>
              <span className={styles.weaverArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </section>

          {!hasAnyEntry ? (
            <StatusPanel tone="empty" title="Your weave is ready to begin">
              <p>
                You do not have a Character or manageable World yet. Create a
                Character, join an invite, or enter as Weaver to begin a World.
              </p>
            </StatusPanel>
          ) : null}

          <section className={styles.section} aria-labelledby="entry-actions">
            <div className={styles.sectionHeader}>
              <h2 id="entry-actions">Start something new</h2>
            </div>
            <div className={styles.actions}>
              <Link className={styles.actionLink} href="/select/create-character">
                <strong>Create Character</strong>
                <span>Start a new portable Character identity.</span>
              </Link>
              <Link className={styles.actionLink} href="/select/join">
                <strong>Join with invite</strong>
                <span>Use a World or Campaign invitation.</span>
              </Link>
            </div>
          </section>
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
