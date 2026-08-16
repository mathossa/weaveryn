import type { ReactNode } from 'react'
import styles from './app-page.module.css'

export interface AppPageProps {
  title: string
  eyebrow?: string
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  wide?: boolean
}

export function AppPage({
  title,
  eyebrow,
  description,
  actions,
  children,
  wide = false,
}: AppPageProps) {
  return (
    <section className={`${styles.page} ${wide ? styles.wide : ''}`}>
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h1>{title}</h1>
          {description ? (
            <div className={styles.description}>{description}</div>
          ) : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      {children ? <div className={styles.body}>{children}</div> : null}
    </section>
  )
}
