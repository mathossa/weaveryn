'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import styles from '../../campaign.module.css'

const POLL_INTERVAL_MS = 15_000

export function CampaignContextRefresh({
  endpoint,
  initialUpdatedAt,
}: {
  endpoint: string
  initialUpdatedAt: string
}) {
  const router = useRouter()
  const latestUpdatedAt = useRef(initialUpdatedAt)
  const checking = useRef(false)
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    latestUpdatedAt.current = initialUpdatedAt
  }, [initialUpdatedAt])

  useEffect(() => {
    async function checkForUpdate(refreshOnFocus = false) {
      if (document.visibilityState !== 'visible' || checking.current) return
      checking.current = true
      try {
        const response = await fetch(endpoint, {
          credentials: 'same-origin',
          cache: 'no-store',
        })
        if (!response.ok) return
        const body = (await response.json()) as {
          campaign?: { updatedAt?: string }
        }
        const nextUpdatedAt = body.campaign?.updatedAt
        if (
          refreshOnFocus ||
          (nextUpdatedAt && nextUpdatedAt !== latestUpdatedAt.current)
        ) {
          if (nextUpdatedAt && nextUpdatedAt !== latestUpdatedAt.current) {
            latestUpdatedAt.current = nextUpdatedAt
            setHasUpdate(true)
          }
          router.refresh()
        }
      } catch {
        // A transient background refresh failure should not interrupt reading.
      } finally {
        checking.current = false
      }
    }

    const timer = window.setInterval(() => checkForUpdate(), POLL_INTERVAL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdate(true)
    }
    const onFocus = () => checkForUpdate(true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [endpoint, router])

  return hasUpdate ? (
    <span className={styles.updateIndicator} role="status">
      Campaign context updated
    </span>
  ) : null
}
