import { redirect } from 'next/navigation'

interface CreateCharacterPageProps {
  searchParams: Promise<{
    world?: string | string[]
    campaign?: string | string[]
  }>
}

export default async function CreateCharacterPage({
  searchParams,
}: CreateCharacterPageProps) {
  const query = await searchParams
  const target = new URLSearchParams()
  if (typeof query.world === 'string') target.set('world', query.world)
  if (typeof query.campaign === 'string') target.set('campaign', query.campaign)

  const suffix = target.toString()
  redirect(`/select/create-character${suffix ? `?${suffix}` : ''}`)
}
