import { AppPage } from '@/components/app-shell/app-page'

export default function WorldTimelineLoading() {
  return (
    <AppPage
      eyebrow="World history"
      title="Timeline"
      description="Loading the World’s canonical history…"
      wide
      bounded
    >
      <div aria-busy="true">Loading timeline…</div>
    </AppPage>
  )
}
