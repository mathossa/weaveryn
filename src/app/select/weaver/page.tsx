import { notFound, redirect } from 'next/navigation'
import {
  recordWeaverEntryUse,
  resolveWeaverEntry,
} from '@/server/selection'
import { loadSelectionPageData } from '../_lib/load-selection-page-data'

interface WeaverEntryPageProps {
  searchParams: Promise<{ world?: string | string[] }>
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
  })
  redirect(`/world/${state.world.id}`)
}
