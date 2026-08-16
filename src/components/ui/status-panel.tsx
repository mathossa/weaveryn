import type { ReactNode } from 'react'
import styles from './status-panel.module.css'

export type StatusPanelTone = 'empty' | 'loading' | 'error'

export interface StatusPanelProps {
  tone: StatusPanelTone
  title: string
  children?: ReactNode
  action?: ReactNode
}

const toneLabels: Record<StatusPanelTone, string> = {
  empty: 'Empty',
  loading: 'Loading',
  error: 'Error',
}

export function StatusPanel({
  tone,
  title,
  children,
  action,
}: StatusPanelProps) {
  const isError = tone === 'error'
  const isLoading = tone === 'loading'

  return (
    <section
      className={`${styles.panel} ${styles[tone]}`}
      role={isError ? 'alert' : 'status'}
      aria-busy={isLoading || undefined}
    >
      <span className={styles.marker} aria-hidden="true">
        {tone === 'loading' ? '···' : tone === 'error' ? '!' : '◇'}
      </span>
      <div className={styles.copy}>
        <p className={styles.toneLabel}>{toneLabels[tone]}</p>
        <h2>{title}</h2>
        {children ? <div className={styles.description}>{children}</div> : null}
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
    </section>
  )
}
