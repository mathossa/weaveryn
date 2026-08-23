import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import {
  requestedCharacterContext,
  withCharacterContext,
} from '@/lib/campaign-context'
import { campaignRoleLabel } from '@/lib/role-labels'
import { uiAssets } from '@/lib/ui-assets'
import { requireAuthenticatedUser } from '@/server/auth'
import { getCampaignNowContext } from '@/server/campaigns'
import { getLatestCampaignEntryPreference } from '@/server/selection'
import { getWorldOverview } from '@/server/worlds'
import { CampaignContextControls } from './_components/campaign-context-controls'
import { CampaignContextRefresh } from './_components/campaign-context-refresh'
import { QuickEntityCapture } from './_components/quick-entity-capture'
import styles from '../campaign.module.css'

interface CampaignOverviewPageProps {
  params: Promise<{ worldId: string; campaignId: string }>
  searchParams: Promise<{
    character?: string | string[]
    mode?: string | string[]
  }>
}

export default async function CampaignOverviewPage({
  params,
  searchParams,
}: CampaignOverviewPageProps) {
  const [{ worldId, campaignId }, query, user] = await Promise.all([
    params,
    searchParams,
    requireAuthenticatedUser(new Headers(await headers())),
  ])
  const explicitWeaverMode = query.mode === 'weaver'
  const explicitThreadwatcherMode = query.mode === 'threadwatcher'
  const requestedWorldCharacterId = requestedCharacterContext(query.character)
  const shouldLoadCampaignPreference =
    !requestedWorldCharacterId &&
    !explicitWeaverMode &&
    !explicitThreadwatcherMode
  const [now, latestCampaignPreference, worldOverview] = await Promise.all([
    getCampaignNowContext(worldId, campaignId, user.id),
    shouldLoadCampaignPreference
      ? getLatestCampaignEntryPreference(user.id, campaignId)
      : Promise.resolve(null),
    getWorldOverview(worldId, user.id),
  ])
  if (!now) notFound()
  const { campaign } = now

  const preferredWorldCharacterId =
    explicitWeaverMode || explicitThreadwatcherMode
      ? undefined
      : (requestedWorldCharacterId ??
        (latestCampaignPreference?.kind === 'CHARACTER'
          ? (latestCampaignPreference.worldCharacterId ?? undefined)
          : undefined))
  const selectedCharacter = preferredWorldCharacterId
    ? campaign.characters.find(
        (character) =>
          character.worldCharacterId === preferredWorldCharacterId &&
          character.ownedByCurrentUser,
      )
    : undefined
  const characterContextId = selectedCharacter?.worldCharacterId
  const campaignHref = explicitWeaverMode
    ? `/world/${worldId}/campaign/${campaign.id}?mode=weaver`
    : explicitThreadwatcherMode
      ? `/world/${worldId}/campaign/${campaign.id}?mode=threadwatcher`
      : withCharacterContext(
          `/world/${worldId}/campaign/${campaign.id}`,
          characterContextId,
        )
  const manageCampaignHref = explicitWeaverMode
    ? `/world/${worldId}/campaign/${campaign.id}/manage?mode=weaver`
    : withCharacterContext(
        `/world/${worldId}/campaign/${campaign.id}/manage`,
        characterContextId,
      )
  const canManageCampaign =
    campaign.canEditSharedInfo ||
    campaign.canEditName ||
    campaign.canManageMembers
  const isWeaverContext =
    !selectedCharacter &&
    (campaign.isOwner ||
      campaign.role === 'GM' ||
      campaign.role === 'ASSISTANT_GM')
  const canCaptureWorldContent =
    isWeaverContext &&
    Boolean(
      worldOverview &&
      ['OWNER', 'ADMIN', 'MEMBER'].includes(worldOverview.accessKind),
    )
  const roleLabel = campaignRoleLabel(campaign.role)
  const entityContextQuery = `?campaign=${campaign.id}${characterContextId ? `&character=${characterContextId}` : ''}`
  const contextEndpoint = `/api/v1/worlds/${worldId}/campaigns/${campaign.id}/context`
  const campaignApiEndpoint = `/api/v1/worlds/${worldId}/campaigns/${campaign.id}`

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: {
          label: campaign.world.name,
          href: explicitThreadwatcherMode
            ? `/world/${worldId}/campaign?mode=threadwatcher`
            : `/world/${worldId}`,
        },
        campaign: { label: campaign.name, href: campaignHref },
        ...(selectedCharacter
          ? {
              character: {
                label: selectedCharacter.name,
                href: `/character/${selectedCharacter.worldCharacterId}?campaign=${campaign.id}`,
              },
            }
          : {}),
      }}
    >
      <AppPage
        eyebrow={`${campaign.world.name} · ${campaign.isOwner ? 'Weaver (Owner)' : roleLabel}`}
        title={campaign.name}
        description={
          selectedCharacter
            ? `You entered as ${selectedCharacter.name}. Find the Campaign context you need, then return to the table.`
            : isWeaverContext
              ? 'Shape the shared Campaign context without requiring a prepared Scene.'
              : 'Follow the player-visible Campaign context.'
        }
        layout="workspace"
        actions={
          <div className={styles.nowHeaderActions}>
            {canManageCampaign ? (
              <Link className={styles.primaryQuiet} href={manageCampaignHref}>
                Manage
              </Link>
            ) : null}
            <Link
              className={styles.secondary}
              href={`/world/${worldId}/campaign${explicitThreadwatcherMode ? '?mode=threadwatcher' : ''}`}
            >
              Change Campaign
            </Link>
          </div>
        }
      >
        <CampaignContextRefresh
          endpoint={campaignApiEndpoint}
          initialUpdatedAt={campaign.updatedAt}
        />

        <nav className={styles.mobileCompanion} aria-label="Campaign companion">
          <a href="#now">Now</a>
          {selectedCharacter ? (
            <Link
              href={`/character/${selectedCharacter.worldCharacterId}?campaign=${campaign.id}`}
            >
              Character
            </Link>
          ) : null}
          <Link href={`/world/${worldId}/entities${entityContextQuery}`}>
            Explore
          </Link>
          <a href="#party">Party</a>
          {canManageCampaign ? (
            <Link href={manageCampaignHref}>More</Link>
          ) : null}
        </nav>

        <div className={styles.nowLayout}>
          <section className={styles.locationHero} id="now">
            <Image
              className={styles.locationImage}
              src={now.currentLocation?.image || uiAssets.fallbacks.campaign}
              alt=""
              fill
              priority
              sizes="(max-width: 760px) 100vw, 68vw"
              style={
                now.currentLocation
                  ? {
                      objectPosition: `${now.currentLocation.imageFocusX}% ${now.currentLocation.imageFocusY}%`,
                    }
                  : undefined
              }
            />
            <div className={styles.locationShade} />
            <div className={styles.locationCopy}>
              <span>Where am I?</span>
              <h2>{now.currentLocation?.name ?? 'Location not set'}</h2>
              <p>
                {now.currentLocation?.description ??
                  (campaign.canUpdateCurrentLocation
                    ? 'Choose a visible Location to anchor this Campaign.'
                    : 'Your Weaver has not shared a Current Location yet.')}
              </p>
              {now.currentLocation ? (
                <Link
                  href={`/world/${worldId}/entities/${now.currentLocation.id}${entityContextQuery}`}
                >
                  Open Location
                </Link>
              ) : null}
            </div>
            <div className={styles.locationMeta}>
              <span>{campaign.status}</span>
              {campaign.currentWorldDateLabel ? (
                <span>{campaign.currentWorldDateLabel}</span>
              ) : null}
            </div>
          </section>

          <section className={styles.nowSection} id="around">
            <div className={styles.sectionHeading}>
              <div>
                <span>What is around me?</span>
                <h2>Around You</h2>
              </div>
              <Link href={`/world/${worldId}/entities${entityContextQuery}`}>
                Explore visible entities
              </Link>
            </div>
            {now.aroundYou.length === 0 ? (
              <p className={styles.emptyNow}>
                {now.currentLocation
                  ? 'No visible entity connections surround this Location yet.'
                  : 'Around You will follow the Current Location and its visible connections.'}
              </p>
            ) : (
              <div className={styles.aroundGrid}>
                {now.aroundYou.slice(0, 6).map((entity) => (
                  <Link
                    className={styles.aroundCard}
                    href={`/world/${worldId}/entities/${entity.id}${entityContextQuery}`}
                    key={entity.id}
                  >
                    <span className={styles.aroundPortrait}>
                      <Image
                        src={
                          entity.image || uiAssets.backgrounds.entityBanner.src
                        }
                        alt=""
                        fill
                        sizes="80px"
                        style={{
                          objectPosition: `${entity.imageFocusX}% ${entity.imageFocusY}%`,
                        }}
                      />
                    </span>
                    <span className={styles.aroundCopy}>
                      <small>{entity.relationship}</small>
                      <strong>{entity.name}</strong>
                      <span>{entity.type}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside className={styles.nowRail}>
            <section className={styles.focusPanel} id="next">
              <span>What is next?</span>
              <h2>What&apos;s Next</h2>
              <p>
                {campaign.currentFocus ||
                  'No current focus has been shared. Follow the world in front of you.'}
              </p>
            </section>

            {campaign.description ? (
              <section className={styles.weaverPanel}>
                <span>Latest from Weaver</span>
                <p>{campaign.description}</p>
              </section>
            ) : null}

            {selectedCharacter ? (
              <Link
                className={styles.characterCallout}
                href={`/character/${selectedCharacter.worldCharacterId}?campaign=${campaign.id}`}
                id="character"
              >
                <span className={styles.characterPortrait}>
                  <Image
                    src={
                      selectedCharacter.image || uiAssets.fallbacks.character
                    }
                    alt=""
                    fill
                    sizes="64px"
                  />
                </span>
                <span>
                  <small>Your Character</small>
                  <strong>{selectedCharacter.name}</strong>
                  <em>Open overview →</em>
                </span>
              </Link>
            ) : null}

            <section className={styles.partyPanel} id="party">
              <div className={styles.sectionHeadingCompact}>
                <h2>Party</h2>
                <span>{campaign.characters.length}</span>
              </div>
              {campaign.characters.length === 0 ? (
                <p className={styles.emptyNow}>
                  No active Campaign Characters.
                </p>
              ) : (
                <div className={styles.compactParty}>
                  {campaign.characters.map((character) => (
                    <span title={character.name} key={character.id}>
                      <Image
                        src={character.image || uiAssets.fallbacks.character}
                        alt={character.name}
                        fill
                        sizes="42px"
                      />
                    </span>
                  ))}
                </div>
              )}
            </section>
          </aside>

          {campaign.canUpdateCurrentLocation ? (
            <section className={styles.weaverWorkspace}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>Shared context</span>
                  <h2>Campaign controls</h2>
                </div>
                <small>
                  {campaign.canEditSharedInfo
                    ? 'Weaver workspace'
                    : 'Granted Chronicler capability'}
                </small>
              </div>
              <CampaignContextControls
                endpoint={contextEndpoint}
                locations={now.locationChoices}
                currentLocationId={now.currentLocation?.id ?? null}
                currentFocus={campaign.currentFocus}
                canUpdateFocus={campaign.canEditSharedInfo}
              />
              {canCaptureWorldContent ? (
                <div className={styles.captureRegion}>
                  <div>
                    <span>Capture now, enrich later</span>
                    <p>
                      Create a minimal Campaign-visible Person or Place. Add
                      detail and connections from the entity workspace later.
                    </p>
                  </div>
                  <QuickEntityCapture
                    worldId={worldId}
                    campaignId={campaign.id}
                  />
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
