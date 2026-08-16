import { WEAVERYN_VERSION } from '@/lib/version'

export function AppFooter() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/75 px-4 py-2 text-xs text-white/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <span>Weaveryn v{WEAVERYN_VERSION}</span>
        <a
          href="https://github.com/mathossa/weaveryn"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-white"
        >
          GitHub
        </a>
      </div>
    </footer>
  )
}
