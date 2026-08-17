import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { resolveCharacterEntry } from '@/server/selection'
import { loadSelectionPageData } from '../../_lib/load-selection-page-data'
import styles from '../../select.module.css'

interface CharacterEntryPageProps {
  params: Promise<{ worldCharacterId: string }>
  searchParams: Promise<{ campaign?: string | string[] }>
}

export default async function CharacterEntryPage({
  params,
  searchParams,
}: CharacterEntryPageProps) {
  const [{ worldCharacterId }, query, pageData] = await Promise.all([
    params,
    searchParams,
    loadSelectionPageData(),
  ])
  const selectedCampaignId =
    typeof query.campaign === 'string' ? query.campaign : undefined
  const state = resolveCharacterEntry(
    pageData.selection.characters,
    worldCharacterId,
    selectedCampaignId,
  )

  if (state.kind === 'not-found') notFound()

  if (state.kind === 'selected') {
    if (state.campaign) {
      redirect(
        `/world/${state.character.worldId}/campaign/${state.campaign.id}?character=${state.character.id}`,
      )
    }
    redirect(`/character/${state.character.id}`)
  }

  const context = {
    world: { label: state.character.worldName },
    character: { label: state.character.name },
  }

  return (
    <AuthenticatedAppShell user={pageData.user} context={context}>
      <AppPage
        eyebrow={state.character.worldName}
        title={`Choose a campaign for ${state.character.name}`}
        description="This WorldCharacter participates in more than one accessible Campaign."
        actions={
          <Link className={styles.backLink} href="/select">
            Back
          </Link>
        }
      >
        <div className={styles.choiceList}>
          {state.campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              className={styles.choiceLink}
              href={`/world/${state.character.worldId}/campaign/${campaign.id}?character=${state.character.id}`}
            >
              <strong>{campaign.name}</strong>
              <span>Continue →</span>
            </Link>
          ))}
        </div>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
