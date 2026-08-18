import { redirect } from 'next/navigation'

export default function CharacterSelectionPage() {
  redirect('/select?show=all')
}
