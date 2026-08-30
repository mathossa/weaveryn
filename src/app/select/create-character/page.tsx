import { AuthenticatedAppShell } from '@/components/app-shell/authenticated-app-shell'
import { loadCharacterPageUser } from '../../character/_lib/load-character-user'
import { CharacterCreationLauncher } from './_components/character-creation-launcher'

interface CreateCharacterPageProps {
  searchParams: Promise<{
    world?: string | string[]
    campaign?: string | string[]
  }>
}

export default async function CreateCharacterPage({
  searchParams,
}: CreateCharacterPageProps) {
  const [query, user] = await Promise.all([
    searchParams,
    loadCharacterPageUser(),
  ])
  const targetWorldId =
    typeof query.world === 'string' ? query.world : undefined
  const targetCampaignId =
    typeof query.campaign === 'string' ? query.campaign : undefined

  return (
    <AuthenticatedAppShell user={user} variant="launcher">
      <CharacterCreationLauncher
        targetWorldId={targetWorldId}
        targetCampaignId={targetCampaignId}
      />
    </AuthenticatedAppShell>
  )
}
