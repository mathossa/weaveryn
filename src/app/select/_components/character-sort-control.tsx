'use client'

import { useRouter } from 'next/navigation'
import styles from './character-sort-control.module.css'

export type CharacterSortMode = 'recent' | 'alphabetical'

export function CharacterSortControl({
  value,
  query,
  world,
}: {
  value: CharacterSortMode
  query?: string
  world?: string
}) {
  const router = useRouter()

  return (
    <label className={styles.control}>
      <span>Sort</span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value as CharacterSortMode
          document.cookie = `weaveryn-character-sort=${next}; Path=/; Max-Age=31536000; SameSite=Lax`
          const parameters = new URLSearchParams({ show: 'all', sort: next })
          if (query) parameters.set('q', query)
          if (world) parameters.set('world', world)
          router.replace(`/select?${parameters.toString()}`, { scroll: false })
        }}
      >
        <option value="recent">Recently opened</option>
        <option value="alphabetical">Alphabetical (A–Z)</option>
      </select>
    </label>
  )
}
