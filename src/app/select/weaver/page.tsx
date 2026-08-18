import { notFound, redirect } from 'next/navigation'
import {
  recordWeaverEntryUse,
  resolveWeaverEntry,
} from '@/server/selection'
import { loadSelectionPageData } from '../_lib/load-selection-page-data'

interface WeaverEntryPageProps {
  searchParams: Promise<{
    world?: string | string[]
    campaign?: string | string[]
  }>
}

export default async function WeaverEntryPage({
  searchParams,
}: WeaverEntryPageProps) {
  const [query, pageData] = await Promise.all([
    searchParams,
    loadSelectionPageData(),
  ])
  const selectedWorldId =
    typeof query.world === 'string' ? query.world : undefined
  const selectedCampaignId =
    typeof query.campaign === 'string' ? query.campaign : undefined
  const state = resolveWeaverEntry(
    pageData.selection.weaverWorlds,
    selectedWorldId,
  )

  if (state.kind === 'not-found') notFound()
  if (state.kind === 'create-world') redirect('/world/create')
  if (state.kind === 'world-choice') redirect('/world?mode=weaver')

  await recordWeaverEntryUse({
    userId: pageData.user.id,
    worldId: state.world.id,
    campaignId: selectedCampaignId,
  })

  if (selectedCampaignId) {
    redirect(
      `/world/${state.world.id}/campaign/${selectedCampaignId}?mode=weaver`,
    )
  }
  redirect(`/world/${state.world.id}?mode=weaver`)
}
