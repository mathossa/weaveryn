import Image from 'next/image'
import { TrackedEntryLink } from '@/components/entry/tracked-entry-link'
import { uiAssets } from '@/lib/ui-assets'
import type {
  EntryCampaignChoice,
  EntryWorldCharacterChoice,
} from '@/server/selection'
import fixStyles from '../select-card-fixes.module.css'
import polishStyles from '../select-polish.module.css'
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
    <div
      className={`${styles.characterCardFrame} ${fixStyles.ornamentFrame}`}
    >
      <TrackedEntryLink
        className={`${styles.characterCard} ${polishStyles.characterCard} ${fixStyles.pageCardMarker} ${fixStyles.ornamentCard} ${highlighted ? `${styles.resumeEntry} ${polishStyles.resumeEntry}` : ''}`}
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
          <span className={styles.characterCampaign}>{contextLabel}</span>
          <span className={styles.characterWorldTime}>
            <span>{character.worldName}</span>
            <span>{campaign?.currentWorldDateLabel ?? 'Time not set'}</span>
          </span>
          <span className={polishStyles.characterFooter}>
            <span className={styles.characterMembers}>
              {campaign ? `${campaign.memberCount} members` : 'No party yet'}
            </span>
            <span className={polishStyles.continueAction} aria-hidden="true">
              Continue <span>→</span>
            </span>
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
