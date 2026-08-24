'use client'

import Image from 'next/image'
import type { UiArtwork } from '@/lib/ui-assets'
import styles from '../entity.module.css'

export function EntityArtworkPicker({
  choices,
  image,
  onChange,
}: {
  choices: readonly UiArtwork[]
  image: string
  onChange: (image: string) => void
}) {
  const selectedImage = image.trim()

  return (
    <div className={styles.artworkChoices}>
      {choices.map((artwork, index) => {
        const isDefault = index === 0
        const selected = isDefault
          ? selectedImage === '' || selectedImage === artwork.src
          : selectedImage === artwork.src

        return (
          <button
            className={styles.artworkChoice}
            type="button"
            aria-label={
              (isDefault
                ? 'Default artwork'
                : 'Artwork option ' + (index + 1)) +
              ': ' +
              artwork.alt
            }
            aria-pressed={selected}
            key={artwork.slug}
            onClick={() => onChange(isDefault ? '' : artwork.src)}
          >
            <span className={styles.artworkThumbnail}>
              <Image
                src={artwork.src}
                alt=""
                fill
                sizes="(max-width: 720px) 42vw, 11rem"
              />
            </span>
            <span className={styles.artworkChoiceCopy}>
              <strong>{isDefault ? 'Default' : 'Option ' + (index + 1)}</strong>
              <small>{artwork.name}</small>
            </span>
          </button>
        )
      })}
    </div>
  )
}
