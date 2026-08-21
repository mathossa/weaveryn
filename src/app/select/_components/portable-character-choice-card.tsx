import Image from 'next/image'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { uiAssets } from '@/lib/ui-assets'
import type { EntryPortableCharacterChoice } from '@/server/selection'
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
      className={styles.characterCard}
      href={`/character/portable/${character.id}`}
      tracking={{ kind: 'PORTABLE_CHARACTER', characterId: character.id }}
      ariaLabel={`Open portable Character ${character.name}`}
    >
      <Image
        className={styles.characterImage}
        src={character.image || uiAssets.fallbacks.character}
        alt=""
        fill
        sizes="(max-width: 760px) 100vw, 33vw"
        loading={eager ? 'eager' : 'lazy'}
      />
      <span className={styles.characterShade} aria-hidden="true" />
      <span className={styles.characterCopy}>
        <strong>{character.name}</strong>
        <span>Portable Character</span>
        <span className={styles.characterMeta}>Not in a World yet</span>
      </span>
    </TrackedEntryLink>
  )
}
