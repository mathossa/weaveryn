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
import { getCampaignOverview } from '@/server/campaigns'
import { listEntryPreferences } from '@/server/selection'
import {
  CampaignDashboardIcon,
  type CampaignDashboardIconName,
} from './_components/campaign-dashboard-icon'
import styles from '../campaign.module.css'

interface CampaignOverviewPageProps {
  params: Promise<{ worldId: string; campaignId: string }>
  searchParams: Promise<{
    character?: string | string[]
    mode?: string | string[]
  }>
}

interface QuickAction {
  label: string
  icon: CampaignDashboardIconName
  href: string
  implemented?: boolean
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
  const [campaign, entryPreferences] = await Promise.all([
    getCampaignOverview(worldId, campaignId, user.id),
    listEntryPreferences(user.id),
  ])
  if (!campaign) notFound()

  const explicitWeaverMode = query.mode === 'weaver'
  const explicitThreadwatcherMode = query.mode === 'threadwatcher'
  const requestedWorldCharacterId = requestedCharacterContext(query.character)
  const latestCampaignPreference =
    requestedWorldCharacterId || explicitWeaverMode || explicitThreadwatcherMode
      ? undefined
      : entryPreferences
          .filter(
            (preference) =>
              preference.campaignId === campaign.id && preference.lastUsedAt,
          )
          .sort(
            (left, right) =>
              (right.lastUsedAt?.getTime() ?? 0) -
              (left.lastUsedAt?.getTime() ?? 0),
          )[0]
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
  const canChooseCharacter =
    campaign.status === 'ACTIVE' && campaign.role !== 'SPECTATOR'
  const canManageCampaign =
    campaign.canEditSharedInfo ||
    campaign.canEditName ||
    campaign.canManageMembers
  const isWeaverContext =
    !selectedCharacter &&
    (campaign.isOwner ||
      campaign.role === 'GM' ||
      campaign.role === 'ASSISTANT_GM')
  const roleLabel = campaignRoleLabel(campaign.role)

  const placeholderBase = `/world/${worldId}/campaign/${campaign.id}/placeholder`
  const placeholderHref = (feature: string) =>
    explicitWeaverMode
      ? `${placeholderBase}/${feature}?mode=weaver`
      : explicitThreadwatcherMode
        ? `${placeholderBase}/${feature}?mode=threadwatcher`
        : withCharacterContext(
            `${placeholderBase}/${feature}`,
            characterContextId,
          )
  const quickActions: QuickAction[] = [
    { label: 'Add Note', icon: 'note', href: placeholderHref('notes') },
    { label: 'Add Event', icon: 'event', href: placeholderHref('event') },
    { label: 'Roll Dice', icon: 'dice', href: placeholderHref('dice') },
    { label: 'Open Map', icon: 'map', href: placeholderHref('map') },
    { label: 'NPCs', icon: 'npc', href: placeholderHref('npcs') },
    { label: 'Items', icon: 'item', href: placeholderHref('items') },
    {
      label: 'World Entities',
      icon: 'entities',
      href: withCharacterContext(
        `/world/${worldId}/entities?campaign=${campaign.id}`,
        characterContextId,
      ),
      implemented: true,
    },
    {
      label: 'Timeline',
      icon: 'timeline',
      href: placeholderHref('timeline'),
    },
  ]

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
        campaign: {
          label: campaign.name,
          href: campaignHref,
        },
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
        wide
        bounded
        actions={
          <div className={styles.dashboardHeaderActions}>
            {canManageCampaign ? (
              <Link
                className={styles.manageCampaignLink}
                href={manageCampaignHref}
              >
                <CampaignDashboardIcon name="manage" />
                Manage Campaign
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
        <div className={styles.dashboardGrid}>
          <section
            className={`${styles.dashboardPanel} ${styles.dashboardHero}`}
          >
            <Image
              className={styles.dashboardHeroImage}
              src={uiAssets.fallbacks.campaign}
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 65vw"
              loading="eager"
            />
            <div className={styles.dashboardHeroShade} />
            <div className={styles.dashboardHeroCopy}>
              <span className={styles.dashboardEyebrow}>Current Adventure</span>
              <h2>{campaign.name}</h2>
              <p>
                {campaign.description ||
                  'No Campaign description has been added yet. Manage the Campaign to add one.'}
              </p>
              <div className={styles.dashboardHeroBadges}>
                <span>{campaign.status}</span>
                <span>{roleLabel}</span>
                <span>{campaign.world.name}</span>
              </div>
            </div>
            <aside className={styles.dashboardHeroContext}>
              <span className={styles.dashboardMiniLabel}>
                Current World time
              </span>
              <strong>{campaign.currentWorldDateLabel ?? 'Not set'}</strong>
              <small>
                Position {campaign.currentWorldPosition ?? 'not set'}
              </small>
            </aside>
          </section>

          <section
            className={`${styles.dashboardPanel} ${styles.dashboardActivity}`}
            aria-labelledby="campaign-activity"
          >
            <div className={styles.dashboardPanelHeader}>
              <h2 id="campaign-activity">
                <CampaignDashboardIcon name="activity" />
                Recent Activity
              </h2>
            </div>
            <div className={styles.dashboardPlaceholderList}>
              <div>
                <span className={styles.placeholderDot} />
                <p>
                  <strong>Campaign history</strong>
                  <small>Timeline activity will appear here later.</small>
                </p>
              </div>
              <div>
                <span className={styles.placeholderDot} />
                <p>
                  <strong>World events</strong>
                  <small>#113 will provide real historical events.</small>
                </p>
              </div>
              <div>
                <span className={styles.placeholderDot} />
                <p>
                  <strong>Session activity</strong>
                  <small>Reserved for the later session experience.</small>
                </p>
              </div>
            </div>
            <Link
              className={styles.dashboardPanelLink}
              href={placeholderHref('activity')}
            >
              Activity placeholder <span aria-hidden="true">→</span>
            </Link>
          </section>

          <section
            className={`${styles.dashboardPanel} ${styles.dashboardParty}`}
            aria-labelledby="campaign-party"
          >
            <div className={styles.dashboardPanelHeader}>
              <h2 id="campaign-party">
                <CampaignDashboardIcon name="party" />
                Party ({campaign.characters.length})
              </h2>
            </div>
            <div className={styles.dashboardPartyList}>
              {campaign.characters.length === 0 ? (
                <p className={styles.dashboardEmptyCopy}>
                  No active Campaign Characters are attached yet.
                </p>
              ) : (
                campaign.characters.map((character) => (
                  <article
                    className={styles.dashboardPartyMember}
                    key={character.id}
                  >
                    <span className={styles.dashboardPartyPortrait}>
                      <Image
                        src={character.image || uiAssets.fallbacks.character}
                        alt=""
                        fill
                        sizes="48px"
                      />
                    </span>
                    <span className={styles.dashboardPartyCopy}>
                      <strong>{character.name}</strong>
                      <small>
                        {character.ownedByCurrentUser
                          ? 'Your Character'
                          : 'Party member'}
                      </small>
                    </span>
                  </article>
                ))
              )}
            </div>
            <div className={styles.dashboardPanelFooter}>
              <span>Shared party-member profiles will arrive later.</span>
            </div>
          </section>

          <section
            className={`${styles.dashboardPanel} ${styles.dashboardMap}`}
            aria-labelledby="campaign-map"
          >
            <div className={styles.dashboardPanelHeaderOverlay}>
              <h2 id="campaign-map">
                <CampaignDashboardIcon name="map" />
                Current Area Map
              </h2>
              <span>Placeholder</span>
            </div>
            <Image
              className={styles.dashboardMapImage}
              src={uiAssets.backgrounds.entityBanner.src}
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 42vw"
              loading="eager"
            />
            <div className={styles.dashboardMapShade} />
            <div className={styles.dashboardMapMarker}>
              <CampaignDashboardIcon name="location" />
              <span>
                <strong>{campaign.world.name}</strong>
                <small>Map support arrives in 0.3.0</small>
              </span>
            </div>
            <Link
              className={styles.dashboardMapLink}
              href={placeholderHref('map')}
            >
              Open map placeholder
            </Link>
          </section>

          <section
            className={`${styles.dashboardPanel} ${styles.dashboardObjectives}`}
            aria-labelledby="campaign-objectives"
          >
            <div className={styles.dashboardPanelHeader}>
              <h2 id="campaign-objectives">
                <CampaignDashboardIcon name="objective" />
                Objectives
              </h2>
            </div>
            <div className={styles.dashboardObjectivePlaceholder}>
              <span className={styles.objectiveRing} />
              <div>
                <strong>No objective system yet</strong>
                <p>
                  This space is reserved for Campaign/session objectives without
                  introducing temporary persistence.
                </p>
              </div>
            </div>
            <Link
              className={styles.dashboardPanelLink}
              href={placeholderHref('objectives')}
            >
              Objectives placeholder <span aria-hidden="true">→</span>
            </Link>
          </section>

          <section
            className={`${styles.dashboardPanel} ${styles.dashboardQuickActions}`}
            aria-labelledby="campaign-quick-actions"
          >
            <div className={styles.dashboardPanelHeader}>
              <h2 id="campaign-quick-actions">Quick Actions</h2>
            </div>
            <div className={styles.dashboardActionGrid}>
              {quickActions.map((action) => (
                <Link
                  className={styles.dashboardAction}
                  data-implemented={action.implemented ? 'true' : 'false'}
                  href={action.href}
                  key={action.label}
                >
                  <CampaignDashboardIcon name={action.icon} />
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section
            className={`${styles.dashboardPanel} ${styles.dashboardNotes}`}
            aria-labelledby="campaign-notes"
          >
            <div className={styles.dashboardPanelHeader}>
              <h2 id="campaign-notes">
                <CampaignDashboardIcon name="note" />
                Recent Notes
              </h2>
            </div>
            <div className={styles.dashboardNotesPlaceholder}>
              <p>
                <strong>No shared notes module yet.</strong>
                <span>
                  Recent Campaign notes will populate this panel from the 0.4
                  notes/lore foundation.
                </span>
              </p>
              <Link href={placeholderHref('notes')}>Notes placeholder →</Link>
            </div>
          </section>

          <section
            className={`${styles.dashboardPanel} ${styles.dashboardQuickView}`}
            aria-labelledby="campaign-quick-view"
          >
            {selectedCharacter ? (
              <>
                <div className={styles.dashboardPanelHeader}>
                  <h2 id="campaign-quick-view">Character Quick View</h2>
                  <span className={styles.dashboardContextPill}>
                    Entered as Character
                  </span>
                </div>
                <div className={styles.dashboardCharacterQuickView}>
                  <span className={styles.dashboardQuickPortrait}>
                    <Image
                      src={
                        selectedCharacter.image || uiAssets.fallbacks.character
                      }
                      alt=""
                      fill
                      sizes="96px"
                    />
                  </span>
                  <div>
                    <strong>{selectedCharacter.name}</strong>
                    <span>{campaign.world.name}</span>
                    <p>
                      Shared profile details and ruleset statistics will expand
                      here when those foundations exist.
                    </p>
                  </div>
                </div>
                <Link
                  className={styles.dashboardPrimaryLink}
                  href={`/character/${selectedCharacter.worldCharacterId}?campaign=${campaign.id}`}
                >
                  Open your Character
                </Link>
              </>
            ) : isWeaverContext ? (
              <>
                <div className={styles.dashboardPanelHeader}>
                  <h2 id="campaign-quick-view">
                    <CampaignDashboardIcon name="status" />
                    Weaver Quick View
                  </h2>
                </div>
                <dl className={styles.dashboardStatusGrid}>
                  <div>
                    <dt>Role</dt>
                    <dd>{roleLabel}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{campaign.status}</dd>
                  </div>
                  <div>
                    <dt>Party</dt>
                    <dd>{campaign.characters.length}</dd>
                  </div>
                  <div>
                    <dt>World date</dt>
                    <dd>{campaign.currentWorldDateLabel ?? 'Not set'}</dd>
                  </div>
                </dl>
                {canManageCampaign ? (
                  <Link
                    className={styles.dashboardPrimaryLink}
                    href={manageCampaignHref}
                  >
                    Manage Campaign
                  </Link>
                ) : null}
              </>
            ) : (
              <>
                <div className={styles.dashboardPanelHeader}>
                  <h2 id="campaign-quick-view">
                    {campaign.role === 'SPECTATOR'
                      ? 'Threadwatcher'
                      : 'Your Character'}
                  </h2>
                </div>
                <p className={styles.dashboardEmptyCopy}>
                  {campaign.role === 'SPECTATOR'
                    ? 'You are observing this Campaign without an active Character.'
                    : 'You entered this Campaign without an active Character context.'}
                </p>
                {canChooseCharacter ? (
                  <Link
                    className={styles.dashboardPrimaryLink}
                    href={`/character?world=${worldId}&campaign=${campaign.id}`}
                  >
                    Choose or add your Character
                  </Link>
                ) : null}
              </>
            )}
          </section>
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
