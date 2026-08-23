import type { ReactNode } from 'react'
import styles from './app-page.module.css'

export interface AppPageProps {
  title: string
  eyebrow?: string
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  /** Layout density for the page's outer frame. */
  layout?: 'readable' | 'wide' | 'workspace'
  /** @deprecated Use layout="wide" instead. */
  wide?: boolean
  bounded?: boolean
  className?: string
}

export function AppPage({
  title,
  eyebrow,
  description,
  actions,
  children,
  layout,
  wide = false,
  bounded = false,
  className,
}: AppPageProps) {
  const resolvedLayout = layout ?? (wide ? 'wide' : 'readable')
  return (
    <section
      className={`${styles.page} ${styles[resolvedLayout]} ${bounded ? styles.bounded : ''} ${className ?? ''}`}
    >
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
