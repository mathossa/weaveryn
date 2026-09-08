import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import {
  requestedCharacterContext,
  withCampaignContext,
  withCharacterContext,
} from '@/lib/campaign-context'
import { getWorldCharacterOverview } from '@/server/characters'
import { getWorldTimelineWorkspace } from '@/server/world-events'
import { loadWorldPageUser } from '../../_lib/load-world-user'
import { WorldTimelineView } from './world-timeline-view'
import styles from './timeline.module.css'

interface WorldTimelinePageProps {
  params: Promise<{ worldId: string }>
  searchParams: Promise<{
    campaign?: string | string[]
    character?: string | string[]
    new?: string | string[]
    mode?: string | string[]
  }>
}

export default async function WorldTimelinePage({
  params,
  searchParams,
}: WorldTimelinePageProps) {
  const [{ worldId }, query, user] = await Promise.all([
    params,
    searchParams,
    loadWorldPageUser(),
  ])
  const workspace = await getWorldTimelineWorkspace(worldId, user.id)
  if (!workspace) notFound()

  const weaverMode = query.mode === 'weaver'
  const requestedCampaignId =
    !weaverMode && typeof query.campaign === 'string'
      ? query.campaign
      : undefined
  const requestedWorldCharacterId = !weaverMode
    ? requestedCharacterContext(query.character)
    : undefined
  const requestedWorldCharacter =
    requestedCampaignId && requestedWorldCharacterId
      ? await getWorldCharacterOverview(requestedWorldCharacterId, user.id)
      : null
  const contextParticipation =
    requestedWorldCharacter?.world.id === worldId
      ? requestedWorldCharacter.participations.find(
          (participation) =>
            participation.status === 'ACTIVE' &&
            participation.campaign.id === requestedCampaignId,
        )
      : undefined
  const contextCharacter = contextParticipation
    ? requestedWorldCharacter
    : undefined

  const worldHref = weaverMode
    ? `/world/${worldId}?mode=weaver`
    : withCampaignContext(
        `/world/${worldId}`,
        contextParticipation?.campaign.id,
        contextCharacter?.id,
      )
  const timelineHref = weaverMode
    ? `/world/${worldId}/timeline?mode=weaver`
    : withCampaignContext(
        `/world/${worldId}/timeline`,
        contextParticipation?.campaign.id,
        contextCharacter?.id,
      )

  const reckonings = workspace.reckonings.map((reckoning) => ({
    id: reckoning.id,
    name: reckoning.name,
    anchorWorldPosition: reckoning.anchorWorldPosition,
    anchorWorldDateLabel: reckoning.anchorWorldDateLabel,
    beforeLabel: reckoning.beforeLabel,
    beforeAbbreviation: reckoning.beforeAbbreviation,
    afterLabel: reckoning.afterLabel,
    afterAbbreviation: reckoning.afterAbbreviation,
  }))

  return (
    <AuthenticatedAppShell
      user={user}
      context={{
        world: { id: worldId, label: workspace.world.name, href: worldHref },
        ...(contextParticipation
          ? {
              campaign: {
                id: contextParticipation.campaign.id,
                label: contextParticipation.campaign.name,
                href: withCharacterContext(
                  `/world/${worldId}/campaign/${contextParticipation.campaign.id}`,
                  contextCharacter?.id,
                ),
              },
            }
          : {}),
        ...(contextCharacter && contextParticipation
          ? {
              character: {
                id: contextCharacter.id,
                label: contextCharacter.displayName,
                href: `/character/${contextCharacter.id}?campaign=${contextParticipation.campaign.id}`,
              },
            }
          : {}),
        ...(weaverMode ? { mode: 'weaver' as const } : {}),
      }}
    >
      <AppPage
        eyebrow="World history"
        title="Timeline"
        description={`The canonical history of ${workspace.world.name}. Dates are entered in the World's own notation; Weaveryn keeps the sortable chronology coordinate behind the scenes.`}
        wide
        bounded
        actions={
          <Link className={styles.secondaryButton} href={worldHref}>
            World overview
          </Link>
        }
      >
        <WorldTimelineView
          worldId={worldId}
          worldName={workspace.world.name}
          events={workspace.events}
          reckonings={reckonings}
          entityChoices={workspace.entityChoices}
          canEditEvents={workspace.canEditEvents}
          canManageChronology={workspace.canManageChronology}
          initialCreate={query.new === '1'}
          timelineHref={timelineHref}
        />
      </AppPage>
    </AuthenticatedAppShell>
  )
}
