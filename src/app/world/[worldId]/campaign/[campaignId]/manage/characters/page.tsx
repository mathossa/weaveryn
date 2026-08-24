import Image from 'next/image'
import { notFound } from 'next/navigation'
import { uiAssets } from '@/lib/ui-assets'
import { RemoveCampaignCharacterButton } from '../../_components/remove-campaign-character-button'
import styles from '../../../campaign.module.css'
import { CampaignManagementPage } from '../_components/campaign-management-page'
import {
  loadCampaignManagementPage,
  type CampaignManagementSearchParams,
} from '../_lib/campaign-management-page'

interface CampaignCharactersPageProps {
  params: Promise<{ worldId: string; campaignId: string }>
  searchParams: Promise<CampaignManagementSearchParams>
}

export default async function CampaignCharactersPage({
  params,
  searchParams,
}: CampaignCharactersPageProps) {
  const data = await loadCampaignManagementPage(params, searchParams)
  const { campaign } = data
  if (!campaign.canEditSharedInfo) notFound()

  return (
    <CampaignManagementPage
      data={data}
      title="Characters"
      description="Review and manage the WorldCharacters participating in this Campaign."
      layout="wide"
    >
      <section className={styles.panel}>
        <div className={styles.managementSectionHeading}>
          <div>
            <h2>Campaign Characters</h2>
            <p className={styles.supportingCopy}>
              Removing participation keeps the portable Character and its
              WorldCharacter intact.
            </p>
          </div>
          <strong>{campaign.characters.length}</strong>
        </div>

        {campaign.characters.length === 0 ? (
          <div className={styles.managementEmptyState}>
            <strong>No participating Characters</strong>
            <p>
              Players can attach eligible Characters through their Character
              participation controls.
            </p>
          </div>
        ) : (
          <div className={styles.managementCharacterList}>
            {campaign.characters.map((character) => (
              <article
                className={styles.managementCharacterRow}
                key={character.id}
              >
                <span className={styles.managementCharacterPortrait}>
                  <Image
                    src={character.image || uiAssets.fallbacks.character}
                    alt={`${character.name} portrait`}
                    fill
                    sizes="3.5rem"
                  />
                </span>
                <div>
                  <strong>{character.name}</strong>
                  <span>
                    {character.owner.displayName ??
                      `@${character.owner.username}`}
                    {character.ownedByCurrentUser ? ' · your Character' : ''}
                  </span>
                </div>
                <RemoveCampaignCharacterButton
                  campaignCharacterId={character.id}
                  characterName={character.name}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </CampaignManagementPage>
  )
}
