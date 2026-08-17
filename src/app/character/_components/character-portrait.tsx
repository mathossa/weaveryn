import Image from 'next/image'
import { uiAssets } from '@/lib/ui-assets'
import styles from '../character.module.css'

export function CharacterPortrait({
  image,
  name,
}: {
  image: string | null
  name: string
}) {
  return (
    <div className={styles.portrait}>
      <Image
        src={image || uiAssets.fallbacks.character}
        alt={`${name} portrait`}
        fill
        sizes="(max-width: 640px) 100vw, 18rem"
        loading="eager"
      />
    </div>
  )
}
