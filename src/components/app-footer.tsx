import { WEAVERYN_VERSION } from '@/lib/version'
import styles from './app-footer.module.css'

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner} data-app-footer-grid>
        <span>Weaveryn v{WEAVERYN_VERSION}</span>
        <a
          href="https://github.com/mathossa/weaveryn"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </div>
    </footer>
  )
}
