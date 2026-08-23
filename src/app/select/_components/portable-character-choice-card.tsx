import Image from 'next/image'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { uiAssets } from '@/lib/ui-assets'
import type { EntryPortableCharacterChoice } from '@/server/selection'
import polishStyles from '../select-polish.module.css'
import styles from '../select.module.css'

export function PortableCharacterChoiceCard({
  character,
  eager = false,
}: {
  character: EntryPortableCharacterChoice
  eager?: boolean
}) {
  return (
    <TrackedEntryLink
      className={`${styles.characterCard} ${polishStyles.characterCard}`}
      href={`/character/portable/${character.id}`}
      tracking={{ kind: 'PORTABLE_CHARACTER', characterId: character.id }}
      ariaLabel={`Open portable Character ${character.name}`}
    >
      <Image
        className={`${styles.characterImage} ${polishStyles.characterImage}`}
        src={character.image || uiAssets.fallbacks.character}
        alt=""
        fill
        sizes="(max-width: 760px) 100vw, 33vw"
        loading={eager ? 'eager' : 'lazy'}
      />
      <span
        className={`${styles.characterShade} ${polishStyles.characterShade}`}
        aria-hidden="true"
      />
      <span className={`${styles.characterCopy} ${polishStyles.characterCopy}`}>
        <strong>{character.name}</strong>
        <span>Portable Character</span>
        <span className={polishStyles.characterFooter}>
          <span className={styles.characterMeta}>Not in a World yet</span>
          <span className={polishStyles.continueAction} aria-hidden="true">
            Open <span>→</span>
          </span>
        </span>
      </span>
    </TrackedEntryLink>
  )
}
