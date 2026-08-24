import Image from 'next/image'
import Link from 'next/link'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { uiAssets } from '@/lib/ui-assets'
import { CampaignDashboardIcon } from '../_components/campaign-dashboard-icon'
import styles from '../../campaign.module.css'
import { availableCampaignManagementSections } from './_lib/campaign-management-sections'
import {
  loadCampaignManagementPage,
  type CampaignManagementSearchParams,
} from './_lib/campaign-management-page'

interface CampaignManagePageProps {
  params: Promise<{ worldId: string; campaignId: string }>
  searchParams: Promise<CampaignManagementSearchParams>
}

function countLabel(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

export default async function CampaignManagePage({
  params,
  searchParams,
}: CampaignManagePageProps) {
  const data = await loadCampaignManagementPage(params, searchParams)
  const { campaign } = data
  const sections = new Set(availableCampaignManagementSections(campaign))
  const characterNames = campaign.characters
    .slice(0, 3)
    .map((character) => character.name)
    .join(', ')

  return (
    <AuthenticatedAppShell user={data.user} context={data.shellContext}>
      <main className={styles.managementHub}>
        <Link className={styles.managementBackLink} href={data.campaignHref}>
          ← Back to Campaign
        </Link>

        <header className={styles.managementHero}>
          <Image
            className={styles.managementHeroImage}
            src={uiAssets.fallbacks.campaign}
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 92rem"
          />
          <div className={styles.managementHeroShade} />
          <div className={styles.managementHeroCopy}>
            <span className={styles.managementEyebrow}>Manage Campaign</span>
            <h1>{campaign.name}</h1>
            <div
              className={styles.managementContext}
              aria-label="Campaign management context"
            >
              <span>
                <CampaignDashboardIcon name="map" />
                {campaign.world.name}
              </span>
              <span>
                <i
                  className={styles.managementStatusDot}
                  data-status={campaign.status}
                  aria-hidden="true"
                />
                {data.statusLabel}
              </span>
              <span>
                <CampaignDashboardIcon name="manage" />
                You are {data.roleLabel}
              </span>
              <span>
                <CampaignDashboardIcon name="entities" />
                {countLabel(campaign.memberCount, 'member')}
              </span>
              <span>
                <CampaignDashboardIcon name="party" />
                {countLabel(campaign.characters.length, 'character')}
              </span>
            </div>
          </div>
        </header>

        <section
          className={styles.managementGrid}
          aria-label="Campaign management options"
        >
          {sections.has('details') ? (
            <article className={styles.managementCard}>
              <div className={styles.managementCardHeader}>
                <span>
                  <CampaignDashboardIcon name="status" />
                </span>
                <h2>Campaign details</h2>
              </div>
              <div className={styles.managementCardBody}>
                <strong>{campaign.name}</strong>
                <p>
                  {campaign.description ||
                    'Add a short description for this Campaign.'}
                </p>
              </div>
              <Link
                className={styles.managementCardAction}
                href={data.managementHref('details')}
              >
                Edit details <span aria-hidden>→</span>
              </Link>
            </article>
          ) : null}

          {sections.has('members') ? (
            <article className={styles.managementCard}>
              <div className={styles.managementCardHeader}>
                <span>
                  <CampaignDashboardIcon name="entities" />
                </span>
                <h2>Members &amp; roles</h2>
              </div>
              <div className={styles.managementCardBody}>
                <strong>
                  {countLabel(campaign.memberCount, 'Campaign member')}
                </strong>
                <p>
                  Manage membership roles and existing invitation links while
                  keeping Character participation separate.
                </p>
              </div>
              <Link
                className={styles.managementCardAction}
                href={data.managementHref('members')}
              >
                Manage members <span aria-hidden>→</span>
              </Link>
            </article>
          ) : null}

          {sections.has('characters') ? (
            <article className={styles.managementCard}>
              <div className={styles.managementCardHeader}>
                <span>
                  <CampaignDashboardIcon name="party" />
                </span>
                <h2>Characters</h2>
              </div>
              <div className={styles.managementCardBody}>
                <strong>
                  {countLabel(campaign.characters.length, 'active character')}
                </strong>
                {campaign.characters.length > 0 ? (
                  <>
                    <div
                      className={styles.managementCharacterPreview}
                      aria-hidden="true"
                    >
                      {campaign.characters.slice(0, 4).map((character) => (
                        <span key={character.id}>
                          <Image
                            src={
                              character.image || uiAssets.fallbacks.character
                            }
                            alt=""
                            fill
                            sizes="2.5rem"
                          />
                        </span>
                      ))}
                    </div>
                    <p>
                      {characterNames}
                      {campaign.characters.length > 3 ? ', and more' : ''}
                    </p>
                  </>
                ) : (
                  <p>No Characters are participating yet.</p>
                )}
              </div>
              <Link
                className={styles.managementCardAction}
                href={data.managementHref('characters')}
              >
                Manage characters <span aria-hidden>→</span>
              </Link>
            </article>
          ) : null}

          {sections.has('time') ? (
            <article className={styles.managementCard}>
              <div className={styles.managementCardHeader}>
                <span>
                  <CampaignDashboardIcon name="timeline" />
                </span>
                <h2>World time</h2>
              </div>
              <div className={styles.managementCardBody}>
                <strong>
                  {campaign.currentWorldDateLabel || 'World date not set'}
                </strong>
                <p>
                  Timeline position {campaign.currentWorldPosition || 'not set'}
                </p>
              </div>
              <Link
                className={styles.managementCardAction}
                href={data.managementHref('time')}
              >
                Manage time <span aria-hidden>→</span>
              </Link>
            </article>
          ) : null}

          {sections.has('advanced') ? (
            <article className={styles.managementCard}>
              <div className={styles.managementCardHeader}>
                <span>
                  <CampaignDashboardIcon name="manage" />
                </span>
                <h2>Advanced</h2>
              </div>
              <dl className={styles.managementSummary}>
                <div>
                  <dt>Owner</dt>
                  <dd>
                    {data.ownerLabel}
                    {campaign.isOwner ? ' (you)' : ''}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{data.statusLabel}</dd>
                </div>
              </dl>
              <Link
                className={styles.managementCardAction}
                href={data.managementHref('advanced')}
              >
                Manage advanced options <span aria-hidden>→</span>
              </Link>
            </article>
          ) : null}
        </section>
      </main>
    </AuthenticatedAppShell>
  )
}
