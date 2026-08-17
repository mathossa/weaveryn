import Image from 'next/image'
import Link from 'next/link'
import { uiAssets } from '@/lib/ui-assets'
import type { EntryPortableCharacterChoice } from '@/server/selection'
import styles from '../select.module.css'

export function PortableCharacterChoiceCard({
  character,
}: {
  character: EntryPortableCharacterChoice
}) {
  return (
    <Link
      className={styles.characterCard}
      href={`/character/portable/${character.id}`}
      aria-label={`Open portable Character ${character.name}`}
    >
      <Image
        className={styles.characterImage}
        src={character.image || uiAssets.fallbacks.character}
        alt=""
        fill
        sizes="(max-width: 760px) 100vw, 33vw"
      />
      <span className={styles.characterShade} aria-hidden="true" />
      <span className={styles.characterCopy}>
        <strong>{character.name}</strong>
        <span>Portable Character</span>
        <span className={styles.characterMeta}>Not in a World yet</span>
      </span>
    </Link>
  )
}
