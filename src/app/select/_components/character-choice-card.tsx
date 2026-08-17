import Image from 'next/image'
import Link from 'next/link'
import { uiAssets } from '@/lib/ui-assets'
import type { EntryWorldCharacterChoice } from '@/server/selection'
import styles from '../select.module.css'

export function CharacterChoiceCard({
  character,
  eager = false,
}: {
  character: EntryWorldCharacterChoice
  eager?: boolean
}) {
  const campaignLabel =
    character.campaigns.length === 0
      ? 'World character'
      : character.campaigns.length === 1
        ? character.campaigns[0].name
        : `${character.campaigns.length} campaigns`

  return (
    <Link
      className={styles.characterCard}
      href={`/select/character/${character.id}`}
      aria-label={`Enter as ${character.name} in ${character.worldName}`}
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
        <span>{character.worldName}</span>
        <span className={styles.characterMeta}>{campaignLabel}</span>
      </span>
    </Link>
  )
}
