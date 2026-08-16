import Link from 'next/link'
import { notFound } from 'next/navigation'
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

  const context = {
    world: { label: state.character.worldName },
    character: { label: state.character.name },
    ...(state.kind === 'selected' && state.campaign
      ? { campaign: { label: state.campaign.name } }
      : {}),
  }

  if (state.kind === 'campaign-choice') {
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
                href={`/select/character/${state.character.id}?campaign=${campaign.id}`}
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

  return (
    <AuthenticatedAppShell user={pageData.user} context={context}>
      <AppPage
        eyebrow="Entry selected"
        title={state.character.name}
        description="Your entry context is ready. The destination overview will be connected by the next UI issues."
        actions={
          <Link className={styles.backLink} href="/select">
            Change selection
          </Link>
        }
      >
        <section className={styles.handoff}>
          <h2>Selected context</h2>
          <div className={styles.handoffContext}>
            <span>
              World: <strong>{state.character.worldName}</strong>
            </span>
            <span>
              Character: <strong>{state.character.name}</strong>
            </span>
            {state.campaign ? (
              <span>
                Campaign: <strong>{state.campaign.name}</strong>
              </span>
            ) : (
              <span>
                No Campaign participation yet; enter at World/Character context.
              </span>
            )}
          </div>
          <p className={styles.muted}>
            Character, World, and Campaign overview destinations are implemented
            in the dedicated follow-up UI issues.
          </p>
        </section>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
