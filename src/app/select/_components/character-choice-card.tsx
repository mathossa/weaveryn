import Image from 'next/image'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { uiAssets } from '@/lib/ui-assets'
import type {
  EntryCampaignChoice,
  EntryWorldCharacterChoice,
} from '@/server/selection'
import styles from '../select.module.css'
import { PinEntryButton } from './pin-entry-button'

export function CharacterChoiceCard({
  character,
  campaign,
  pinned = false,
  highlighted = false,
  eager = false,
}: {
  character: EntryWorldCharacterChoice
  campaign: EntryCampaignChoice | null
  pinned?: boolean
  highlighted?: boolean
  eager?: boolean
}) {
  const destination = campaign
    ? `/world/${character.worldId}/campaign/${campaign.id}?character=${character.id}`
    : `/character/${character.id}`
  const contextLabel = campaign?.name ?? 'No campaign'

  return (
    <div className={styles.characterCardFrame}>
      <TrackedEntryLink
        className={`${styles.characterCard} ${highlighted ? styles.resumeEntry : ''}`}
        href={destination}
        tracking={{
          kind: 'CHARACTER',
          worldCharacterId: character.id,
          campaignId: campaign?.id,
        }}
        ariaLabel={
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
      </TrackedEntryLink>
      <PinEntryButton
        worldCharacterId={character.id}
        campaignId={campaign?.id}
        pinned={pinned}
      />
    </div>
  )
}
