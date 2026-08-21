'use client'

import { useRouter } from 'next/navigation'
import styles from './character-sort-control.module.css'

export type CharacterSortMode = 'recent' | 'alphabetical'

export function CharacterSortControl({ value }: { value: CharacterSortMode }) {
  const router = useRouter()

  return (
    <label className={styles.control}>
      <span>Sort</span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value as CharacterSortMode
          document.cookie = `weaveryn-character-sort=${next}; Path=/; Max-Age=31536000; SameSite=Lax`
          router.replace(`/select?show=all&sort=${next}`, { scroll: false })
        }}
      >
        <option value="recent">Recently opened</option>
        <option value="alphabetical">Alphabetical (A–Z)</option>
      </select>
    </label>
  )
}
