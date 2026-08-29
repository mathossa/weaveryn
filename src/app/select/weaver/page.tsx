import { redirect } from 'next/navigation'

export default function WeaverEntryPage() {
  redirect('/world?mode=weaver')
}
