'use client'

import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './hint-popover.module.css'

export interface HintPopoverProps {
  label: string
  children: ReactNode
}

export function HintPopover({ label, children }: HintPopoverProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <span
      className={styles.wrapper}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <button
        className={styles.trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        ?
      </button>
      {open ? (
        <span id={panelId} className={styles.panel} role="note">
          {children}
        </span>
      ) : null}
    </span>
  )
}
