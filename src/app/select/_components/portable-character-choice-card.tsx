import Image from 'next/image'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { uiAssets } from '@/lib/ui-assets'
import type { EntryPortableCharacterChoice } from '@/server/selection'
import fixStyles from '../select-card-fixes.module.css'
import polishStyles from '../select-polish.module.css'
import styles from '../select.module.css'
import { PinEntryButton } from './pin-entry-button'

export function PortableCharacterChoiceCard({
  character,
  pinned = false,
  eager = false,
}: {
  character: EntryPortableCharacterChoice
  pinned?: boolean
  eager?: boolean
}) {
  return (
    <div className={`${styles.characterCardFrame} ${fixStyles.ornamentFrame}`}>
      <TrackedEntryLink
        className={`${styles.characterCard} ${polishStyles.characterCard} ${fixStyles.pageCardMarker} ${fixStyles.ornamentCard}`}
        href={`/character/portable/${character.id}`}
        tracking={{ kind: 'PORTABLE_CHARACTER', characterId: character.id }}
        ariaLabel={`Open portable Character ${character.name}`}
      >
        <span className={fixStyles.characterContentClip}>
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
          <span
            className={`${styles.characterCopy} ${polishStyles.characterCopy} ${fixStyles.characterInnerCopy}`}
          >
            <strong className={styles.characterName}>{character.name}</strong>
            <span
              className={`${styles.characterContext} ${fixStyles.characterMeta}`}
            >
              <span
                className={`${styles.characterContextRow} ${fixStyles.characterMetaRow}`}
              >
                <small>Character</small>
                <span className={styles.characterCampaignName}>
                  Portable identity
                </span>
              </span>
              <span
                className={`${styles.characterContextRow} ${fixStyles.characterMetaRow}`}
              >
                <small>World</small>
                <span className={styles.characterWorldName}>
                  Not yet woven into a World
                </span>
              </span>
            </span>
          </span>
        </span>
        <span className={fixStyles.characterFrameOverlay} aria-hidden="true" />
      </TrackedEntryLink>
      <PinEntryButton characterId={character.id} pinned={pinned} />
    </div>
  )
}
