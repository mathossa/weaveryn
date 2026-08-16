import Image from 'next/image'
import type { ReactNode } from 'react'
import { uiAssets } from '@/lib/ui-assets'
import styles from './auth-shell.module.css'

export interface AuthShellProps {
  children: ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  const background = uiAssets.backgrounds.authShell

  return (
    <main className={styles.shell}>
      <Image
        src={background.src}
        alt=""
        fill
        loading="eager"
        sizes="100vw"
        className={styles.background}
        aria-hidden="true"
      />
      <div className={styles.veil} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
    </main>
  )
}
