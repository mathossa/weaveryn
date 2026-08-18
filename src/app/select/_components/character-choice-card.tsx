import Image from 'next/image'
import Link from 'next/link'
import { uiAssets } from '@/lib/ui-assets'
import type {
  EntryCampaignChoice,
  EntryWorldCharacterChoice,
} from '@/server/selection'
import styles from '../select.module.css'

export function CharacterChoiceCard({
  character,
  campaign,
  eager = false,
}: {
  character: EntryWorldCharacterChoice
  campaign: EntryCampaignChoice | null
  eager?: boolean
}) {
  const destination = campaign
    ? `/world/${character.worldId}/campaign/${campaign.id}?character=${character.id}`
    : `/character/${character.id}`
  const contextLabel = campaign?.name ?? 'No campaign'

  return (
    <Link
      className={styles.characterCard}
      href={destination}
      aria-label={
        campaign
          ? `Enter ${campaign.name} as ${character.name} in ${character.worldName}`
          : `Open ${character.name} in ${character.worldName}`
      }
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
        <span>
          {character.worldName} — {contextLabel}
        </span>
        <span className={styles.characterMeta}>
          {campaign ? 'Campaign entry' : 'World character'}
        </span>
      </span>
    </Link>
  )
}
