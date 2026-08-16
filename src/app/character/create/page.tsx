import Link from 'next/link'
import { AppPage } from '@/components/app-shell/app-page'
import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { CharacterForm } from '../_components/character-form'
import { loadCharacterPageUser } from '../_lib/load-character-user'
import styles from '../character.module.css'

interface CreateCharacterPageProps {
  searchParams: Promise<{
    world?: string | string[]
    campaign?: string | string[]
  }>
}

export default async function CreateCharacterPage({
  searchParams,
}: CreateCharacterPageProps) {
  const [query, user] = await Promise.all([searchParams, loadCharacterPageUser()])
  const worldId = typeof query.world === 'string' ? query.world : undefined
  const campaignId =
    typeof query.campaign === 'string' ? query.campaign : undefined

  return (
    <AuthenticatedAppShell user={user}>
      <AppPage
        eyebrow="Portable identity"
        title="Create Character"
        description="Create the Character identity first. You can add it to a World now or leave it portable until later."
        actions={
          <Link className={styles.secondary} href="/character">
            Back to Characters
          </Link>
        }
      >
        <section className={styles.panel}>
          <CharacterForm
            mode="create"
            targetWorldId={worldId}
            targetCampaignId={campaignId}
          />
        </section>
      </AppPage>
    </AuthenticatedAppShell>
  )
}
